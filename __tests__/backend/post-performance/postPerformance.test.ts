import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FacebookPerformanceCollector } from '@/backend/modules/post-performance/facebook-performance-collector';
import { PostPerformanceModule } from '@/backend/modules/post-performance/post-performance-module';
import type { PostPerformanceRepository, PostToUpdate, PerformanceMetrics } from '@/backend/modules/post-performance/post-performance-types';

describe('FacebookPerformanceCollector', () => {
  it('successfully fetches public metrics and insights', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('metric=')) {
        let val = 100;
        if (url.includes('post_impressions_unique')) val = 80;
        if (url.includes('post_clicks')) val = 15;
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                { values: [{ value: val }] },
              ],
            }),
        } as Response);
      } else {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              reactions: { summary: { total_count: 50 } },
              comments: { summary: { total_count: 10 } },
              shares: { count: 5 },
            }),
        } as Response);
      }
    });

    const collector = new FacebookPerformanceCollector(mockFetch);
    const metrics = await collector.fetchPostMetrics('post-123', 'token-abc');

    expect(metrics).toEqual({
      likes: 50,
      comments: 10,
      shares: 5,
      clicks: 15,
      reach: 80,
      impressions: 100,
    });
  });

  it('degrades gracefully when insights are not accessible', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('insights')) {
        return Promise.resolve({
          ok: false,
          statusText: 'Forbidden',
          json: () => Promise.resolve({ error: { message: 'Unsupported get request' } }),
        } as Response);
      } else {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              reactions: { summary: { total_count: 20 } },
              comments: { summary: { total_count: 5 } },
              shares: null,
            }),
        } as Response);
      }
    });

    const collector = new FacebookPerformanceCollector(mockFetch);
    const metrics = await collector.fetchPostMetrics('post-123', 'token-abc');

    expect(metrics).toEqual({
      likes: 20,
      comments: 5,
      shares: 0,
      clicks: 0,
      reach: 0,
      impressions: 0,
    });
  });

  it('throws RATE_LIMIT error when API limit is reached', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({ error: { code: 17, message: 'User request limit reached' } }),
      } as Response)
    );

    const collector = new FacebookPerformanceCollector(mockFetch);
    await expect(collector.fetchPostMetrics('post-123', 'token-abc')).rejects.toThrow('RATE_LIMIT');
  });
});

describe('PostPerformanceModule', () => {
  let mockRepo: PostPerformanceRepository;
  let mockCollector: any;

  beforeEach(() => {
    mockRepo = {
      findRecentPostedPosts: vi.fn(),
      findPostsWithInteractions: vi.fn(),
      findPageAccessToken: vi.fn(),
      upsertInteractions: vi.fn(),
    };
    mockCollector = {
      platform: 'facebook',
      fetchPostMetrics: vi.fn(),
    };
  });

  it('synchronizes metrics for posts successfully', async () => {
    const mockPosts: PostToUpdate[] = [
      { id: 'post-id-1', platform: 'facebook', externalPostId: 'fb-post-1', userId: 'user-1' },
    ];
    (mockRepo.findRecentPostedPosts as any).mockResolvedValue(mockPosts);
    (mockRepo.findPageAccessToken as any).mockResolvedValue('token-1');
    mockCollector.fetchPostMetrics.mockResolvedValue({
      likes: 10, comments: 2, shares: 1, clicks: 5, reach: 20, impressions: 30,
    });
    (mockRepo.upsertInteractions as any).mockResolvedValue(true);

    const module = new PostPerformanceModule(mockRepo, mockCollector);
    const result = await module.syncFacebookPerformance();

    expect(result.succeeded).toBe(1);
    expect(result.attempted).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(mockRepo.upsertInteractions).toHaveBeenCalledWith('post-id-1', {
      likes: 10, comments: 2, shares: 1, clicks: 5, reach: 20, impressions: 30,
    });
  });

  it('stops processing when encountering a RATE_LIMIT error', async () => {
    const mockPosts: PostToUpdate[] = [
      { id: 'post-id-1', platform: 'facebook', externalPostId: 'fb-post-1', userId: 'user-1' },
      { id: 'post-id-2', platform: 'facebook', externalPostId: 'fb-post-2', userId: 'user-1' },
    ];
    (mockRepo.findRecentPostedPosts as any).mockResolvedValue(mockPosts);
    (mockRepo.findPageAccessToken as any).mockResolvedValue('token-1');
    mockCollector.fetchPostMetrics.mockRejectedValue(new Error('RATE_LIMIT: API block'));

    const module = new PostPerformanceModule(mockRepo, mockCollector);
    const result = await module.syncFacebookPerformance();

    expect(result.attempted).toBe(1); // Chỉ chạy 1 bài rồi dừng
    expect(result.succeeded).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({ postId: 'post-id-1', error: 'RATE_LIMIT: API block' });
  });
});
