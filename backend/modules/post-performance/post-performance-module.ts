import type { PerformanceCollector, PostPerformanceRepository } from './post-performance-types';

export class PostPerformanceModule {
  private readonly collectorMap = new Map<string, PerformanceCollector>();

  constructor(
    private readonly repository: PostPerformanceRepository,
    collectors: PerformanceCollector | PerformanceCollector[]
  ) {
    const collectorArray = Array.isArray(collectors) ? collectors : [collectors];
    collectorArray.forEach(c => {
      this.collectorMap.set(c.platform, c);
    });
  }

  /**
   * Phương thức tương thích ngược cho Facebook
   */
  async syncFacebookPerformance(limit: number = 50) {
    return this.syncPlatformPerformance('facebook', limit);
  }

  /**
   * Đồng bộ chỉ số tương tác cho một nền tảng cụ thể (facebook, instagram, v.v.)
   */
  async syncPlatformPerformance(platform: 'facebook' | 'instagram' | 'threads', limit: number = 50): Promise<{
    attempted: number;
    succeeded: number;
    errors: Array<{ postId: string; error: string }>;
  }> {
    const collector = this.collectorMap.get(platform);
    if (!collector) {
      console.warn(`[PostPerformanceModule] Chưa đăng ký PerformanceCollector cho nền tảng: ${platform}`);
      return { attempted: 0, succeeded: 0, errors: [] };
    }

    const posts = await this.repository.findRecentPostedPosts(limit, 30, platform);
    let attempted = 0;
    let succeeded = 0;
    const errors: Array<{ postId: string; error: string }> = [];

    for (const post of posts) {
      attempted += 1;
      try {
        const token = await this.repository.findPageAccessToken(post.userId, platform);
        if (!token) {
          throw new Error(`Không tìm thấy Access Token hợp lệ cho ${platform}`);
        }

        const metrics = await collector.fetchPostMetrics(post.externalPostId, token);
        const saveSuccess = await this.repository.upsertInteractions(post.id, metrics);
        
        if (saveSuccess) {
          succeeded += 1;
        } else {
          throw new Error('Lỗi khi lưu dữ liệu tương tác vào cơ sở dữ liệu');
        }
      } catch (err: any) {
        const errorMsg = err.message || 'Lỗi không xác định';
        console.error(`[PostPerformanceModule] Thất bại khi sync ${platform} cho post_id ${post.id}:`, errorMsg);
        errors.push({ postId: post.id, error: errorMsg });

        if (errorMsg.includes('RATE_LIMIT')) {
          console.warn(`[PostPerformanceModule] Phát hiện Rate Limit từ ${platform} API. Dừng chu kỳ đồng bộ.`);
          break;
        }
      }
    }

    return { attempted, succeeded, errors };
  }

  /**
   * Đồng bộ chỉ số cho tất cả các nền tảng đã đăng ký
   */
  async syncAllPerformance(limit: number = 50) {
    const results: Record<string, { attempted: number; succeeded: number }> = {};
    for (const platform of Array.from(this.collectorMap.keys())) {
      results[platform] = await this.syncPlatformPerformance(platform as any, limit);
    }
    return results;
  }
}
