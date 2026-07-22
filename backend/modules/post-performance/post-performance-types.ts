export interface PerformanceMetrics {
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  reach: number;
  impressions: number;
  saved?: number;
}

export interface PerformanceCollector {
  readonly platform: 'facebook' | 'instagram' | 'threads';
  fetchPostMetrics(
    externalPostId: string,
    accessToken: string
  ): Promise<PerformanceMetrics>;
}

export interface PostToUpdate {
  id: string; // id của scheduled_posts
  platform: string;
  externalPostId: string; // ví dụ: fb_post_id hoặc ig_media_id
  userId: string;
  postedAt?: string;
  lastSyncedAt?: string | null;
}

export interface PostWithInteractions {
  id: string;
  postedAt: string;
  platform: string;
  interactions?: PerformanceMetrics;
}

export interface GoldenHoursResult {
  slots: GoldenHourSlot[];
  topOptimalSlots: GoldenHourSlot[];
  recommendedBestTimeText: string;
  platformName: string;
}

export interface PostPerformanceRepository {
  findRecentPostedPosts(limit: number, daysAgo?: number, platform?: string): Promise<PostToUpdate[]>;
  findPostsWithInteractions(userId: string, platform?: string, daysAgo?: number): Promise<PostWithInteractions[]>;
  findPageAccessToken(userId: string, platform: string, accountId?: string): Promise<string | null>;
  upsertInteractions(postId: string, metrics: PerformanceMetrics): Promise<boolean>;
}

export interface GoldenHourSlot {
  dayOfWeek: number; // 0 (Chủ nhật) -> 6 (Thứ 7)
  dayName: string;   // Ví dụ: "Thứ Hai", "Thứ Ba"...
  hourOfDay: number; // 0 -> 23
  avgEngagementRate: number;
  totalPosts: number;
  isOptimal: boolean;
}

