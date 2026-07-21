import type { PerformanceCollector, PerformanceMetrics } from './post-performance-types';

export class ThreadsPerformanceCollector implements PerformanceCollector {
  readonly platform = 'threads' as const;

  constructor(
    private readonly fetchImplementation: typeof fetch = fetch,
    private readonly apiVersion: string = 'v1.0'
  ) {}

  async fetchPostMetrics(
    externalPostId: string,
    accessToken: string
  ): Promise<PerformanceMetrics> {
    const baseUrl = `https://graph.threads.net/${this.apiVersion}/${externalPostId}`;

    let likes = 0;
    let comments = 0; // replies in Threads
    let shares = 0;   // reposts + quotes in Threads
    let clicks = 0;
    let reach = 0;
    let impressions = 0; // views in Threads

    // 1. Fetch Threads Insights (views, likes, replies, reposts, quotes)
    try {
      const insightsUrl = `${baseUrl}/insights?metric=views,likes,replies,reposts,quotes&access_token=${accessToken}`;
      const response = await this.fetchImplementation(insightsUrl);

      if (response.ok) {
        const data = await response.json();
        console.log(`[Threads Performance Collector] Raw Insights for post ${externalPostId}:`, JSON.stringify(data));
        if (Array.isArray(data?.data)) {
          for (const item of data.data) {
            const value = item.values?.[0]?.value ?? item.total_value?.value ?? 0;
            if (item.name === 'views') {
              impressions = value;
              reach = Math.max(reach, Math.floor(value * 0.85)); // Ước tính reach từ views
            } else if (item.name === 'likes') {
              likes = Math.max(likes, value);
            } else if (item.name === 'replies') {
              comments = Math.max(comments, value);
            } else if (item.name === 'reposts' || item.name === 'quotes') {
              shares += value;
            }
          }
        }
      } else {
        const errorJson = await response.json().catch(() => ({}));
        console.warn(
          `[Threads Performance Collector] Thất bại khi lấy insights cho post ${externalPostId}:`,
          errorJson?.error?.message || response.statusText
        );
      }
    } catch (err: any) {
      if (err.message?.includes('RATE_LIMIT')) {
        throw err;
      }
      console.warn(`[Threads Performance Collector] Lỗi khi lấy insights bài đăng ${externalPostId}:`, err.message);
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
      throw new Error(`RATE_LIMIT: Bị hạn chế tần suất bởi Threads API (${type}): ${errorMsg}`);
    }

    throw new Error(`Threads API error (${type}): ${errorMsg} (Code: ${errorCode})`);
  }
}
