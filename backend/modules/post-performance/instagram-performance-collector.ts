import type { PerformanceCollector, PerformanceMetrics } from './post-performance-types';

export class InstagramPerformanceCollector implements PerformanceCollector {
  readonly platform = 'instagram' as const;

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

    // 1. Lấy chỉ số công khai từ Instagram Graph API (like_count, comments_count)
    try {
      const publicUrl = `${baseUrl}?fields=like_count,comments_count,media_type&access_token=${accessToken}`;
      const response = await this.fetchImplementation(publicUrl);

      if (!response.ok) {
        await this.handleErrorResponse(response, 'Instagram public metrics');
      }

      const data = await response.json();
      likes = data?.like_count ?? 0;
      comments = data?.comments_count ?? 0;
    } catch (err: any) {
      if (err.message?.includes('RATE_LIMIT') || err.message?.includes('LIMIT_REACHED')) {
        throw err;
      }
      console.warn(`[Instagram Performance Collector] Không thể lấy public metrics cho post ${externalPostId}:`, err.message);
    }

    // 2. Lấy chỉ số Insights từ Instagram Graph API (reach, impressions, saved, shares)
    try {
      const insightsUrl = `${baseUrl}/insights?metric=reach,impressions,saved,shares&access_token=${accessToken}`;
      const response = await this.fetchImplementation(insightsUrl);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data?.data)) {
          for (const item of data.data) {
            const value = item.values?.[0]?.value ?? item.total_value?.value ?? 0;
            if (item.name === 'reach') {
              reach = value;
            } else if (item.name === 'impressions') {
              impressions = value;
            } else if (item.name === 'saved') {
              shares += value;
            } else if (item.name === 'shares') {
              shares += value;
            }
          }
        }
      } else {
        const errorJson = await response.json().catch(() => ({}));
        console.warn(
          `[Instagram Performance Collector] Thất bại khi lấy insights cho post ${externalPostId}:`,
          errorJson?.error?.message || response.statusText
        );
      }
    } catch (err: any) {
      console.warn(`[Instagram Performance Collector] Lỗi khi gọi insights API cho post ${externalPostId}:`, err.message);
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

    if (response.status === 429 || errorCode === 17 || errorCode === 32 || errorCode === 613) {
      throw new Error(`RATE_LIMIT: Bị chặn tạm thời bởi Instagram API (${type}): ${errorMsg}`);
    }

    throw new Error(`Instagram API error (${type}): ${errorMsg} (Code: ${errorCode})`);
  }
}
