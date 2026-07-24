import type { PerformanceCollector, PerformanceMetrics } from './post-performance-types';

export class FacebookPerformanceCollector implements PerformanceCollector {
  readonly platform = 'facebook' as const;

  constructor(
    private readonly fetchImplementation: typeof fetch = fetch,
    private readonly graphVersion: string = 'v19.0'
  ) {}

  private parseMetricValue(value: any): number {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'object') {
      return Object.values(value).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
    }
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

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

    // 1. Fetch public metrics (reactions, comments, shares)
    try {
      const publicUrl = `${baseUrl}?fields=reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares&access_token=${accessToken}`;
      const response = await this.fetchImplementation(publicUrl);
      
      if (!response.ok) {
        await this.handleErrorResponse(response, 'public metrics');
      }

      const data = await response.json();
      
      likes = this.parseMetricValue(data?.reactions?.summary?.total_count);
      comments = this.parseMetricValue(data?.comments?.summary?.total_count);
      shares = this.parseMetricValue(data?.shares?.count);
    } catch (err: any) {
      // Nếu bị chặn/rate limit thực sự ở cấp API, ta ném lỗi để Module xử lý ngừng vòng lặp
      if (err.message?.includes('RATE_LIMIT') || err.message?.includes('LIMIT_REACHED')) {
        throw err;
      }
      console.warn(`[Facebook Performance Collector] Không thể lấy public metrics cho post ${externalPostId}:`, err.message);
    }

    // 2. Fetch insights metrics in optimized batches to prevent sequential timeouts
    // Group 1: Standard Page Post Metrics (Impressions, Reach, Clicks)
    try {
      const insightsUrl = `${baseUrl}/insights?metric=post_impressions,post_impressions_unique,post_clicks&access_token=${accessToken}`;
      const response = await this.fetchImplementation(insightsUrl);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data?.data)) {
          for (const item of data.data) {
            const rawValue = item.values?.[0]?.value ?? item.total_value?.value ?? 0;
            const value = this.parseMetricValue(rawValue);
            if (item.name === 'post_impressions') impressions = value;
            else if (item.name === 'post_impressions_unique') reach = value;
            else if (item.name === 'post_clicks') clicks = value;
          }
        }
      } else {
        const errorJson = await response.json().catch(() => ({}));
        const errorCode = errorJson?.error?.code || 0;
        const errorMsg = errorJson?.error?.message || response.statusText;

        if (response.status === 429 || errorCode === 17 || errorCode === 32 || errorCode === 613) {
          throw new Error(`RATE_LIMIT: Bị chặn tạm thời bởi Facebook API (insights): ${errorMsg}`);
        }

        // If standard metrics fail (e.g. object type limitations), try Group 2: Media/Video Metrics
        const mediaUrl = `${baseUrl}/insights?metric=post_media_view,post_total_media_view_unique,post_clicks_by_type&access_token=${accessToken}`;
        const mediaResponse = await this.fetchImplementation(mediaUrl);

        if (mediaResponse.ok) {
          const mediaData = await mediaResponse.json();
          if (Array.isArray(mediaData?.data)) {
            for (const item of mediaData.data) {
              const rawValue = item.values?.[0]?.value ?? item.total_value?.value ?? 0;
              const value = this.parseMetricValue(rawValue);
              if (item.name === 'post_media_view') impressions = value;
              else if (item.name === 'post_total_media_view_unique') reach = value;
              else if (item.name === 'post_clicks_by_type') clicks = value;
            }
          }
        } else {
          console.warn(
            `[Facebook Performance Collector] Không thể lấy insights cho post ${externalPostId}:`,
            errorMsg
          );
        }
      }
    } catch (err: any) {
      if (err.message?.includes('RATE_LIMIT')) {
        throw err;
      }
      console.warn(`[Facebook Performance Collector] Lỗi khi gọi insights API cho post ${externalPostId}:`, err.message);
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
