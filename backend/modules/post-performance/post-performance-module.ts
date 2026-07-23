import type { PerformanceCollector, PostPerformanceRepository, GoldenHoursResult } from './post-performance-types';
import { GoldenHoursCalculator } from './golden-hours-calculator';

interface CacheEntry {
  timestamp: number;
  data: GoldenHoursResult;
}

export class PostPerformanceModule {
  private readonly collectorMap = new Map<string, PerformanceCollector>();
  private readonly goldenHoursCache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs = 15 * 60 * 1000; // 15 phút

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
   * Tính toán và trả về giờ vàng phân tích từ lịch sử 30 ngày cho một người dùng & nền tảng (có cache)
   */
  async getGoldenHours(userId: string, platform: string = 'all'): Promise<GoldenHoursResult> {
    const normalizedPlatform = platform.toLowerCase() === 'thread' ? 'threads' : platform.toLowerCase();
    const cacheKey = `${userId}_${normalizedPlatform}`;
    const now = Date.now();

    const cached = this.goldenHoursCache.get(cacheKey);
    if (cached && now - cached.timestamp < this.cacheTtlMs) {
      return cached.data;
    }

    const posts = await this.repository.findPostsWithInteractions(userId, normalizedPlatform, 30);
    const result = GoldenHoursCalculator.calculateGoldenHours(posts, normalizedPlatform);

    this.goldenHoursCache.set(cacheKey, {
      timestamp: now,
      data: result,
    });

    return result;
  }

  /**
   * Xóa cache giờ vàng khi cần
   */
  clearGoldenHoursCache(userId?: string) {
    if (!userId) {
      this.goldenHoursCache.clear();
      return;
    }
    for (const key of this.goldenHoursCache.keys()) {
      if (key.startsWith(`${userId}_`)) {
        this.goldenHoursCache.delete(key);
      }
    }
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
  async syncPlatformPerformance(
    platform: 'facebook' | 'instagram' | 'threads',
    limit: number = 50,
    force: boolean = false
  ): Promise<{
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

    const now = Date.now();
    const HOUR_MS = 60 * 60 * 1000;

    let isRateLimited = false;
    const batchSize = 5;
    
    for (let i = 0; i < posts.length; i += batchSize) {
      if (isRateLimited) break;
      const batch = posts.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (post) => {
        if (isRateLimited) return;

        // Giải pháp phân tầng (Tiered Syncing) để tối ưu hóa tần suất gọi API:
        // - Không cần cập nhật đồng đều tất cả bài viết: Tương tác thường bùng nổ mạnh nhất trong 24 - 48 giờ đầu tiên và đạt trạng thái bão hòa sau 72 giờ.
        // - Tier 1 (Bài đăng < 24 giờ): Crawl mỗi 30 phút - 1 giờ / lần. Khoảng thời gian vàng để bắt trọn tiến trình tăng trưởng tương tác.
        // - Tier 2 (Bài đăng từ 1 - 7 ngày): Crawl mỗi 6 giờ - 12 giờ / lần.
        // - Tier 3 (Bài đăng > 7 ngày): Chỉ crawl 24 giờ / lần hoặc ngưng crawl (ở đây tối đa 30 ngày, sau 30 ngày sẽ dừng crawl hoàn toàn).
        // Bỏ qua kiểm tra phân tầng nếu đây là yêu cầu đồng bộ thủ công (force = true)
        if (!force && post.postedAt && post.lastSyncedAt) {
          const postAgeHours = (now - new Date(post.postedAt).getTime()) / HOUR_MS;
          const timeSinceLastSyncHours = (now - new Date(post.lastSyncedAt).getTime()) / HOUR_MS;

          if (postAgeHours <= 24) {
            if (timeSinceLastSyncHours < 0.5) return; // Tier 1: 30 phút/lần
          } else if (postAgeHours <= 7 * 24) {
            if (timeSinceLastSyncHours < 6) return; // Tier 2: 6 giờ/lần
          } else {
            if (timeSinceLastSyncHours < 24) return; // Tier 3: 24 giờ/lần
          }
        }

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
            isRateLimited = true;
          }
        }
      }));
    }

    return { attempted, succeeded, errors };
  }

  /**
   * Đồng bộ chỉ số cho tất cả các nền tảng đã đăng ký
   */
  async syncAllPerformance(limit: number = 50, force: boolean = false) {
    const results: Record<string, { attempted: number; succeeded: number }> = {};
    for (const platform of Array.from(this.collectorMap.keys())) {
      results[platform] = await this.syncPlatformPerformance(platform as any, limit, force);
    }
    return results;
  }
}

