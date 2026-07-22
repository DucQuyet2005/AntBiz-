import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostPerformanceModule } from '../../../backend/modules/post-performance/post-performance-module';
import type { PostPerformanceRepository, PostWithInteractions } from '../../../backend/modules/post-performance/post-performance-types';

describe('PostPerformanceModule - Golden Hours & Caching', () => {
  let mockRepository: PostPerformanceRepository;
  let module: PostPerformanceModule;

  const samplePosts: PostWithInteractions[] = [
    {
      id: 'post-1',
      postedAt: new Date(2026, 6, 20, 19, 15, 0).toISOString(), // 2026-07-20 (Thứ 2) 19:15 local
      platform: 'facebook',
      interactions: {
        likes: 100,
        comments: 20,
        shares: 10,
        clicks: 50,
        reach: 1000,
        impressions: 1200,
      },
    },
    {
      id: 'post-2',
      postedAt: new Date(2026, 6, 13, 19, 45, 0).toISOString(), // 2026-07-13 (Thứ 2) 19:45 local
      platform: 'facebook',
      interactions: {
        likes: 150,
        comments: 30,
        shares: 15,
        clicks: 80,
        reach: 1200,
        impressions: 1500,
      },
    },
    {
      id: 'post-3',
      postedAt: new Date(2026, 6, 21, 11, 0, 0).toISOString(), // 2026-07-21 (Thứ 3) 11:00 local
      platform: 'facebook',
      interactions: {
        likes: 10,
        comments: 2,
        shares: 0,
        clicks: 5,
        reach: 500,
        impressions: 600,
      },
    },
  ];


  beforeEach(() => {
    mockRepository = {
      findRecentPostedPosts: vi.fn(),
      findPostsWithInteractions: vi.fn().mockResolvedValue(samplePosts),
      findPageAccessToken: vi.fn(),
      upsertInteractions: vi.fn(),
    };

    module = new PostPerformanceModule(mockRepository, []);
  });

  it('nên tính toán Top 3 khung giờ vàng chính xác dựa trên bài viết 30 ngày qua', async () => {
    const result = await module.getGoldenHours('user-123', 'facebook');

    expect(mockRepository.findPostsWithInteractions).toHaveBeenCalledWith('user-123', 'facebook', 30);
    expect(result.topOptimalSlots.length).toBeGreaterThan(0);
    
    // Slot tốt nhất phải là Thứ 2 (Day 1) lúc 19h
    const topSlot = result.topOptimalSlots[0];
    expect(topSlot.dayOfWeek).toBe(1);
    expect(topSlot.hourOfDay).toBe(19);
    expect(topSlot.isOptimal).toBe(true);
  });

  it('nên lưu cache kết quả và không gọi lại repository trong cùng 15 phút', async () => {
    // Gọi lần 1
    const res1 = await module.getGoldenHours('user-123', 'facebook');
    expect(mockRepository.findPostsWithInteractions).toHaveBeenCalledTimes(1);

    // Gọi lần 2
    const res2 = await module.getGoldenHours('user-123', 'facebook');
    expect(mockRepository.findPostsWithInteractions).toHaveBeenCalledTimes(1); // Không gọi thêm
    expect(res2).toEqual(res1);
  });

  it('nên fallback về khung giờ mặc định khi người dùng chưa có bài viết nào', async () => {
    vi.mocked(mockRepository.findPostsWithInteractions).mockResolvedValueOnce([]);

    const result = await module.getGoldenHours('new-user', 'instagram');

    expect(result.topOptimalSlots).toEqual([]);
    expect(result.recommendedBestTimeText).toContain('Gợi ý khung giờ mặc định');
  });
});
