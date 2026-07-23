import type { PerformanceCollector, PerformanceMetrics } from './post-performance-types';

export class FacebookPerformanceCollector implements PerformanceCollector {
  readonly platform = 'facebook' as const;

  constructor(
    private readonly fetchImplementation: typeof fetch = fetch,
    private readonly graphVersion: string = 'v19.0'
  ) {}

  async fetchPostMetrics(
    externalPostId: string,
    accessToken: string
  ): Promise<PerformanceMetrics> {
    const baseUrl = `https://graph.facebook.com/${this.graphVersion}/${externalPostId}`;
    
    let likes = 0;
    let comments = 0;
    let shares = 0;
    let clicks = 0;
    let reach = 0;
    let impressions = 0;

    // Fetch public and insights concurrently to drastically reduce sync time
    const publicUrl = `${baseUrl}?fields=reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares&access_token=${accessToken}`;
    const insightsUrl = `${baseUrl}/insights?metric=post_impressions,post_impressions_unique,post_clicks&access_token=${accessToken}`;

    const publicPromise = this.fetchImplementation(publicUrl, { cache: 'no-store' }).then(async (res) => {
      if (!res.ok) await this.handleErrorResponse(res, 'public metrics');
      return res.json();
    });

    const insightsPromise = this.fetchImplementation(insightsUrl, { cache: 'no-store' }).then(async (res) => {
      if (res.ok) return res.json();

      const errorJson = await res.json().catch(() => ({}));
      const errorCode = errorJson?.error?.code || 0;
      const errorMsg = errorJson?.error?.message || res.statusText;

      if (res.status === 429 || errorCode === 17 || errorCode === 32 || errorCode === 613) {
        throw new Error(`RATE_LIMIT: Bị chặn tạm thời bởi Facebook API (insights): ${errorMsg}`);
      }

      // If standard metrics fail, try Media/Video Metrics
      const mediaUrl = `${baseUrl}/insights?metric=post_media_view,post_total_media_view_unique,post_clicks_by_type&access_token=${accessToken}`;
      const mediaRes = await this.fetchImplementation(mediaUrl, { cache: 'no-store' });
      if (mediaRes.ok) return mediaRes.json();

      console.warn(`[Facebook Performance Collector] Không thể lấy insights cho post ${externalPostId}:`, errorMsg);
      return null;
    });

    const [publicResult, insightsResult] = await Promise.allSettled([publicPromise, insightsPromise]);

    if (publicResult.status === 'fulfilled' && publicResult.value) {
      const data = publicResult.value;
      likes = data?.reactions?.summary?.total_count ?? 0;
      comments = data?.comments?.summary?.total_count ?? 0;
      shares = data?.shares?.count ?? 0;
    } else if (publicResult.status === 'rejected') {
      const err = publicResult.reason;
      if (err?.message?.includes('RATE_LIMIT') || err?.message?.includes('LIMIT_REACHED')) {
        throw err;
      }
      console.warn(`[Facebook Performance Collector] Lỗi public metrics cho post ${externalPostId}:`, err?.message);
    }

    if (insightsResult.status === 'fulfilled' && insightsResult.value) {
      const data = insightsResult.value;
      if (Array.isArray(data?.data)) {
        for (const item of data.data) {
          const value = item.values?.[0]?.value ?? item.total_value?.value ?? 0;
          if (item.name === 'post_impressions' || item.name === 'post_media_view') impressions = value;
          else if (item.name === 'post_impressions_unique' || item.name === 'post_total_media_view_unique') reach = value;
          else if (item.name === 'post_clicks' || item.name === 'post_clicks_by_type') {
            if (typeof value === 'object' && value !== null) {
              clicks = Object.values(value).reduce((acc: number, val: any) => acc + (typeof val === 'number' ? val : 0), 0) as number;
            } else {
              clicks = typeof value === 'number' ? value : 0;
            }
          }
        }
      }
    } else if (insightsResult.status === 'rejected') {
      const err = insightsResult.reason;
      if (err?.message?.includes('RATE_LIMIT')) {
        throw err;
      }
      console.warn(`[Facebook Performance Collector] Lỗi insights API cho post ${externalPostId}:`, err?.message);
    }

    return {
      likes,
      comments,
      shares,
      clicks,
      reach,
      impressions,
    };
  }

  private async handleErrorResponse(response: Response, type: string): Promise<never> {
    let errorMsg = response.statusText;
    let errorCode = 0;
    try {
      const errJson = await response.json();
      errorMsg = errJson?.error?.message || errorMsg;
      errorCode = errJson?.error?.code || 0;
    } catch {}

    // Facebook Graph API rate limit error codes: 17, 32, 613
    if (response.status === 429 || errorCode === 17 || errorCode === 32 || errorCode === 613) {
      throw new Error(`RATE_LIMIT: Bị chặn tạm thời bởi Facebook API (${type}): ${errorMsg}`);
    }

    throw new Error(`Facebook API error (${type}): ${errorMsg} (Code: ${errorCode})`);
  }
}
