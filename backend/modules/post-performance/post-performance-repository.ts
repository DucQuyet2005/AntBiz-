import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostPerformanceRepository, PostToUpdate, PerformanceMetrics } from './post-performance-types';

export class SupabasePostPerformanceRepository implements PostPerformanceRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findRecentPostedPosts(limit: number, daysAgo: number = 30, platform?: string): Promise<PostToUpdate[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    let query = this.supabase
      .from('scheduled_posts')
      .select('id, platform, fb_post_id, threads_post_id, instagram_media_id, created_by, posted_at, post_interactions(updated_at)')
      .eq('status', 'posted')
      .gte('posted_at', cutoffDate.toISOString())
      .order('posted_at', { ascending: false })
      .limit(limit);

    if (platform) {
      const dbPlatform = platform === 'threads' ? 'thread' : platform;
      query = query.eq('platform', dbPlatform);
      if (platform === 'threads') {
        query = query.not('threads_post_id', 'is', null);
      } else if (platform === 'instagram') {
        query = query.not('instagram_media_id', 'is', null);
      } else {
        query = query.not('fb_post_id', 'is', null);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('[PostPerformanceRepository] Lỗi khi truy vấn các bài đã đăng:', error);
      return [];
    }

    return (data || []).map((post: any) => {
      let externalPostId = post.fb_post_id;
      if (post.platform === 'thread') {
        externalPostId = post.threads_post_id;
      } else if (post.platform === 'instagram') {
        externalPostId = post.instagram_media_id;
      }

      const interactionRaw = Array.isArray(post.post_interactions)
        ? post.post_interactions[0]
        : post.post_interactions;
      const lastSyncedAt = interactionRaw?.updated_at || null;

      return {
        id: post.id,
        platform: post.platform === 'thread' ? 'threads' : post.platform,
        externalPostId: externalPostId || '',
        userId: post.created_by,
        postedAt: post.posted_at,
        lastSyncedAt,
      };
    }).filter(post => post.externalPostId !== '');
  }

  async findPostsWithInteractions(userId: string, platform?: string, daysAgo: number = 30): Promise<import('./post-performance-types').PostWithInteractions[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    let query = this.supabase
      .from('scheduled_posts')
      .select(`
        id,
        posted_at,
        platform,
        post_interactions (
          likes,
          comments,
          shares,
          clicks,
          reach,
          impressions
        )
      `)
      .eq('created_by', userId)
      .eq('status', 'posted')
      .gte('posted_at', cutoffDate.toISOString());

    if (platform && platform !== 'all') {
      const dbPlatform = platform === 'threads' ? 'thread' : platform;
      query = query.eq('platform', dbPlatform);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[PostPerformanceRepository] Lỗi khi lấy danh sách bài đăng kèm tương tác:', error);
      return [];
    }

    return (data || []).map((post: any) => {
      const interactionRaw = Array.isArray(post.post_interactions)
        ? post.post_interactions[0]
        : post.post_interactions;

      const interactions: PerformanceMetrics | undefined = interactionRaw
        ? {
            likes: Number(interactionRaw.likes || 0),
            comments: Number(interactionRaw.comments || 0),
            shares: Number(interactionRaw.shares || 0),
            clicks: Number(interactionRaw.clicks || 0),
            reach: Number(interactionRaw.reach || 0),
            impressions: Number(interactionRaw.impressions || 0),
          }
        : undefined;

      return {
        id: post.id,
        postedAt: post.posted_at,
        platform: post.platform === 'thread' ? 'threads' : post.platform,
        interactions,
      };
    });
  }


  async findPageAccessToken(userId: string, platform: string = 'facebook', accountId?: string): Promise<string | null> {
    const dbPlatform = platform === 'threads' ? 'thread' : platform;
    const baseQuery = this.supabase
      .from('linked_accounts')
      .select('access_token')
      .eq('user_id', userId)
      .eq('platform', dbPlatform);

    if (accountId) {
      // For facebook/instagram, accountId might be in format {page_id}_{post_id}
      const actualAccountId = accountId.includes('_') ? accountId.split('_')[0] : accountId;
      const { data, error } = await baseQuery.eq('account_id', actualAccountId).maybeSingle();
      if (!error && data?.access_token) {
        return data.access_token;
      }
    }

    // Fallback: get any token for this user and platform
    const { data, error } = await this.supabase
      .from('linked_accounts')
      .select('access_token')
      .eq('user_id', userId)
      .eq('platform', dbPlatform)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`[PostPerformanceRepository] Lỗi khi lấy access token cho platform ${platform}:`, error);
      return null;
    }

    return data?.access_token || null;
  }

  async upsertInteractions(postId: string, metrics: PerformanceMetrics): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('post_interactions')
      .upsert({
        post_id: postId,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        clicks: metrics.clicks,
        reach: metrics.reach,
        impressions: metrics.impressions,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'post_id' });

    if (error) {
      console.error(`[PostPerformanceRepository] Lỗi khi lưu post_interactions cho post_id ${postId}:`, error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }
}
