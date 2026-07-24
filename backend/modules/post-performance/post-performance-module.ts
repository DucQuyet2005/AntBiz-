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
    const keys = Array.from(this.goldenHoursCache.keys());
    for (const key of keys) {
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
    const batchSize = limit; // Fetch tất cả các bài cùng lúc (thường là 50)
    const tokenCache = new Map<string, Promise<string | null>>();
    
    for (let i = 0; i < posts.length; i += batchSize) {
      if (isRateLimited) break;
      const batch = posts.slice(i, i + batchSize);
      const metricsToUpsert: Array<{ postId: string; metrics: any }> = [];
      
      await Promise.all(batch.map(async (post) => {
        if (isRateLimited) return;

        if (!force && post.postedAt && post.lastSyncedAt) {
          const postAgeHours = (now - new Date(post.postedAt).getTime()) / HOUR_MS;
          const timeSinceLastSyncHours = (now - new Date(post.lastSyncedAt).getTime()) / HOUR_MS;

          if (postAgeHours <= 24) {
            if (timeSinceLastSyncHours < 0.5) return; 
          } else if (postAgeHours <= 7 * 24) {
            if (timeSinceLastSyncHours < 6) return; 
          } else {
            if (timeSinceLastSyncHours < 24) return; 
          }
        }

        attempted += 1;
        try {
          const cacheKey = `${post.userId}_${platform}_${post.externalPostId.includes('_') ? post.externalPostId.split('_')[0] : post.externalPostId}`;
          let tokenPromise = tokenCache.get(cacheKey);
          if (!tokenPromise) {
            tokenPromise = this.repository.findPageAccessToken(post.userId, platform, post.externalPostId);
            tokenCache.set(cacheKey, tokenPromise);
          }
          const token = await tokenPromise;
          if (!token) {
            throw new Error(`Không tìm thấy Access Token hợp lệ cho ${platform}`);
          }

          const metrics = await collector.fetchPostMetrics(post.externalPostId, token);
          metricsToUpsert.push({ postId: post.id, metrics });
          succeeded += 1;
        } catch (err: any) {
          const errorMsg = err.message || 'Lỗi không xác định';
          console.error(`[PostPerformanceModule] Thất bại khi lấy dữ liệu ${platform} cho post_id ${post.id}:`, errorMsg);
          errors.push({ postId: post.id, error: errorMsg });

          if (errorMsg.includes('RATE_LIMIT')) {
            console.warn(`[PostPerformanceModule] Phát hiện Rate Limit từ ${platform} API. Dừng chu kỳ đồng bộ.`);
            isRateLimited = true;
          }
        }
      }));

      if (metricsToUpsert.length > 0) {
        const { success, error: dbError } = await this.repository.upsertInteractionsBulk(metricsToUpsert);
        if (!success) {
          console.error(`[PostPerformanceModule] Lỗi bulk upsert cho ${platform}:`, dbError);
          // Revert succeeded count if upsert failed
          succeeded -= metricsToUpsert.length;
          errors.push({ postId: 'bulk_upsert', error: dbError || 'Lỗi lưu database hàng loạt' });
        }
      }
    }

    return { attempted, succeeded, errors };
  }

  /**
   * Đồng bộ chỉ số cho tất cả các nền tảng đã đăng ký
   */
  async syncAllPerformance(limit: number = 50, force: boolean = false) {
    const results: Record<string, { attempted: number; succeeded: number }> = {};
    const platforms = Array.from(this.collectorMap.keys());
    
    await Promise.all(platforms.map(async (platform) => {
      results[platform] = await this.syncPlatformPerformance(platform as any, limit, force);
    }));
    
    return results;
  }
}

