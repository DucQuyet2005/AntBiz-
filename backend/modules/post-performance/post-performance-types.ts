export interface PerformanceMetrics {
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  reach: number;
  impressions: number;
}

export interface PerformanceCollector {
  fetchPostMetrics(
    externalPostId: string,
    accessToken: string
  ): Promise<PerformanceMetrics>;
}

export interface PostToUpdate {
  id: string; // id của scheduled_posts
  platform: string;
  externalPostId: string; // ví dụ: fb_post_id
  userId: string;
}

export interface PostPerformanceRepository {
  findRecentPostedPosts(limit: number, daysAgo?: number): Promise<PostToUpdate[]>;
  findPageAccessToken(userId: string, accountId: string): Promise<string | null>;
  upsertInteractions(postId: string, metrics: PerformanceMetrics): Promise<boolean>;
}
