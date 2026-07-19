export type PublishingPlatform = 'facebook' | 'instagram' | 'thread';
export type ScheduledPostStatus = 'pending' | 'posted' | 'failed' | 'cancelled';

export interface ScheduledPublishingActor {
  userId: string;
  role: string;
}

export interface ArticleSummary {
  id?: string;
  title?: string | null;
  category?: string | null;
  description?: string | null;
}

export interface CaptionSummary {
  id: string;
  created_by?: string;
  platform: string;
  ai_content?: string | null;
  edited_content?: string | null;
  articles?: ArticleSummary | null;
}

export interface ScheduledPostRecord {
  id: string;
  caption_id: string;
  created_by: string;
  platform: string;
  status: ScheduledPostStatus;
  scheduled_at: string;
  posted_at?: string | null;
  failed_at?: string | null;
  failure_reason?: string | null;
  fb_post_id?: string | null;
  threads_post_id?: string | null;
  instagram_media_id?: string | null;
  post_result?: unknown;
  image_urls?: string[] | null;
  created_at?: string;
  updated_at?: string;
  captions?: CaptionSummary | null;
  users?: { id?: string; email?: string | null } | null;
}

export interface CalendarFilters {
  from?: string;
  to?: string;
  platforms?: string[];
  creatorId?: string;
}

export interface LinkedAccountRecord {
  access_token?: string | null;
  account_id?: string | null;
}

export interface PublicationRequest {
  platform: PublishingPlatform;
  message: string;
  imageUrls: string[];
  accessToken?: string;
  accountId?: string;
}

export type PublicationResult =
  | { success: true; postId: string }
  | { success: false; error: string };

export interface SocialPublisher {
  publish(input: PublicationRequest): Promise<PublicationResult>;
}

export interface SchedulingNotificationInput {
  kind: 'scheduled' | 'rescheduled';
  userId: string;
  articleTitle: string;
  post: ScheduledPostRecord;
}

export interface PublicationNotificationInput {
  userId: string;
  userEmail: string;
  postTitle: string;
  platformName: string;
  post: ScheduledPostRecord;
  result: PublicationResult;
}

export interface PublicationNotifier {
  scheduling(input: SchedulingNotificationInput): Promise<void>;
  publication(input: PublicationNotificationInput): Promise<void>;
}

export interface ScheduledPublishingRepository {
  list(): Promise<ScheduledPostRecord[]>;
  findCaption(id: string): Promise<CaptionSummary | null>;
  findPendingByCaption(captionId: string): Promise<ScheduledPostRecord | null>;
  insert(input: Record<string, unknown>): Promise<ScheduledPostRecord>;
  update(id: string, input: Record<string, unknown>): Promise<ScheduledPostRecord>;
  findById(id: string): Promise<ScheduledPostRecord | null>;
  findByIds(ids: string[]): Promise<ScheduledPostRecord[]>;
  updatePending(id: string, input: Record<string, unknown>): Promise<ScheduledPostRecord | null>;
  updatePendingMany(ids: string[], input: Record<string, unknown>): Promise<ScheduledPostRecord[]>;
  updateCaptionStatus(id: string, status: string): Promise<void>;
  listCalendar(filters: CalendarFilters): Promise<ScheduledPostRecord[]>;
  findDue(nowIso: string): Promise<ScheduledPostRecord[]>;
  claimPending(id: string, nowIso: string): Promise<boolean>;
  findLinkedAccount(userId: string, platform: PublishingPlatform): Promise<LinkedAccountRecord | null>;
  markPosted(id: string, input: Record<string, unknown>): Promise<void>;
  markFailed(id: string, input: Record<string, unknown>): Promise<void>;
}
