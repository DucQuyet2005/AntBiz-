import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostPerformanceRepository, PostToUpdate, PerformanceMetrics } from './post-performance-types';

export class SupabasePostPerformanceRepository implements PostPerformanceRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findRecentPostedPosts(limit: number, daysAgo: number = 30, platform?: string): Promise<PostToUpdate[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    let query = this.supabase
      .from('scheduled_posts')
      .select('id, platform, fb_post_id, created_by')
      .eq('status', 'posted')
      .not('fb_post_id', 'is', null)
      .gte('posted_at', cutoffDate.toISOString())
      .order('posted_at', { ascending: false })
      .limit(limit);

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[PostPerformanceRepository] Lỗi khi truy vấn các bài đã đăng:', error);
      return [];
    }

    return (data || []).map((post: any) => ({
      id: post.id,
      platform: post.platform,
      externalPostId: post.fb_post_id,
      userId: post.created_by,
    }));
  }

  async findPageAccessToken(userId: string, platform: string = 'facebook', accountId?: string): Promise<string | null> {
    let query = this.supabase
      .from('linked_accounts')
      .select('access_token')
      .eq('user_id', userId)
      .eq('platform', platform);

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error(`[PostPerformanceRepository] Lỗi khi lấy access token cho platform ${platform}:`, error);
      return null;
    }

    return data?.access_token || null;
  }

  async upsertInteractions(postId: string, metrics: PerformanceMetrics): Promise<boolean> {
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
      return false;
    }

    return true;
  }
}
