import type { PerformanceCollector, PostPerformanceRepository } from './post-performance-types';

export class PostPerformanceModule {
  constructor(
    private readonly repository: PostPerformanceRepository,
    private readonly facebookCollector: PerformanceCollector
  ) {}

  async syncFacebookPerformance(limit: number = 50): Promise<{
    attempted: number;
    succeeded: number;
    errors: Array<{ postId: string; error: string }>;
  }> {
    const posts = await this.repository.findRecentPostedPosts(limit);
    let attempted = 0;
    let succeeded = 0;
    const errors: Array<{ postId: string; error: string }> = [];

    for (const post of posts) {
      attempted += 1;
      try {
        const token = await this.repository.findPageAccessToken(post.userId, post.externalPostId);
        if (!token) {
          throw new Error('Không tìm thấy Facebook Access Token hợp lệ cho người dùng này');
        }

        const metrics = await this.facebookCollector.fetchPostMetrics(post.externalPostId, token);
        const saveSuccess = await this.repository.upsertInteractions(post.id, metrics);
        
        if (saveSuccess) {
          succeeded += 1;
        } else {
          throw new Error('Lỗi khi lưu dữ liệu tương tác vào cơ sở dữ liệu');
        }
      } catch (err: any) {
        const errorMsg = err.message || 'Lỗi không xác định';
        console.error(`[PostPerformanceModule] Thất bại khi sync cho post_id ${post.id}:`, errorMsg);
        errors.push({ postId: post.id, error: errorMsg });

        // Nếu gặp lỗi rate limit (bị chặn tạm thời), dừng ngay việc quét tiếp các bài viết sau
        if (errorMsg.includes('RATE_LIMIT')) {
          console.warn('[PostPerformanceModule] Phát hiện Rate Limit từ Facebook API. Dừng chu kỳ đồng bộ ngay lập tức để tránh bị chặn kéo dài.');
          break;
        }
      }
    }

    return {
      attempted,
      succeeded,
      errors,
    };
  }
}
