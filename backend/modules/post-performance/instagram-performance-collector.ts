import type { PerformanceCollector, PerformanceMetrics } from './post-performance-types';

export class InstagramPerformanceCollector implements PerformanceCollector {
  readonly platform = 'instagram' as const;

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
    let saved = 0;

    // 1. Lấy chỉ số công khai từ Instagram Graph API (like_count, comments_count)
    try {
      const publicUrl = `${baseUrl}?fields=like_count,comments_count,media_type&access_token=${accessToken}`;
      const response = await this.fetchImplementation(publicUrl, { cache: 'no-store' });

      if (!response.ok) {
        await this.handleErrorResponse(response, 'Instagram public metrics');
      }

      const data = await response.json();
      likes = this.parseMetricValue(data?.like_count);
      comments = this.parseMetricValue(data?.comments_count);
    } catch (err: any) {
      if (err.message?.includes('RATE_LIMIT') || err.message?.includes('LIMIT_REACHED')) {
        throw err;
      }
      console.warn(`[Instagram Performance Collector] Không thể lấy public metrics cho post ${externalPostId}:`, err.message);
    }

    // 2. Lấy chỉ số Insights từ Instagram Graph API (reach, saved, shares)
    // Lưu ý: Meta đã deprecate chỉ số 'impressions' trên v19.0+/v22.0+, nếu gọi sẽ bị lỗi (#100)/(#10).
    try {
      const insightsUrl = `${baseUrl}/insights?metric=reach,saved,shares&access_token=${accessToken}`;
      const response = await this.fetchImplementation(insightsUrl, { cache: 'no-store' });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data?.data)) {
          for (const item of data.data) {
            const rawValue = item.values?.[0]?.value ?? item.total_value?.value ?? 0;
            const value = this.parseMetricValue(rawValue);
            if (item.name === 'reach') {
              reach = value;
            } else if (item.name === 'impressions') {
              impressions = value;
            } else if (item.name === 'saved') {
              saved = value;
            } else if (item.name === 'shares') {
              shares += value;
            }
          }
          if (impressions === 0 && reach > 0) {
            impressions = reach; // Fallback: Mỗi lượt reach tương ứng ít nhất 1 lượt hiển thị
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
      saved,
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
