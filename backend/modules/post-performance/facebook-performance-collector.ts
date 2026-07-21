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

    // 1. Fetch public metrics (reactions, comments, shares)
    try {
      const publicUrl = `${baseUrl}?fields=reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares&access_token=${accessToken}`;
      const response = await this.fetchImplementation(publicUrl);
      
      if (!response.ok) {
        await this.handleErrorResponse(response, 'public metrics');
      }

      const data = await response.json();
      
      likes = data?.reactions?.summary?.total_count ?? 0;
      comments = data?.comments?.summary?.total_count ?? 0;
      shares = data?.shares?.count ?? 0;
    } catch (err: any) {
      // Nếu bị chặn/rate limit thực sự ở cấp API, ta ném lỗi để Module xử lý ngừng vòng lặp
      if (err.message?.includes('RATE_LIMIT') || err.message?.includes('LIMIT_REACHED')) {
        throw err;
      }
      console.warn(`[Facebook Performance Collector] Không thể lấy public metrics cho post ${externalPostId}:`, err.message);
    }

    // 2. Fetch insights metrics (impressions, reach, clicks)
    const metricsToFetch = ['post_impressions', 'post_impressions_unique', 'post_clicks'];
    for (const metric of metricsToFetch) {
      try {
        const insightsUrl = `${baseUrl}/insights?metric=${metric}&access_token=${accessToken}`;
        const response = await this.fetchImplementation(insightsUrl);

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data?.data) && data.data.length > 0) {
            const value = data.data[0].values?.[0]?.value ?? 0;
            if (metric === 'post_impressions') {
              impressions = value;
            } else if (metric === 'post_impressions_unique') {
              reach = value;
            } else if (metric === 'post_clicks') {
              clicks = value;
            }
          }
        } else {
          const errorJson = await response.json().catch(() => ({}));
          console.warn(
            `[Facebook Performance Collector] Thất bại khi lấy metric '${metric}' cho post ${externalPostId}:`,
            errorJson?.error?.message || response.statusText
          );
        }
      } catch (err: any) {
        console.warn(`[Facebook Performance Collector] Lỗi khi gọi insights API cho metric '${metric}' của post ${externalPostId}:`, err.message);
      }
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
