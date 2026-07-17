export type NotificationType = 'post_success' | 'post_failed' | 'ab_test_complete' | 'info';
export type NotificationCategory = 'all' | 'bai-dang' | 'prompt' | 'lich' | 'he-thong';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: unknown;
  emailSent?: boolean;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  metadata: unknown;
  created_at: string;
  email_sent: boolean;
}

export interface UserNotificationSettings {
  email_on_success: boolean;
  email_on_failure: boolean;
  email_digest_enabled: boolean;
  email_digest_time: string;
}

export interface NotificationListInput {
  page: number;
  limit: number;
  category: NotificationCategory;
}

export interface NotificationListResult {
  data: NotificationRecord[];
  count: number;
}

export type NotificationFilter =
  | { kind: 'empty' }
  | { kind: 'all' }
  | { kind: 'types'; types: NotificationType[] }
  | { kind: 'keywords'; type: 'info'; keywords: string[] }
  | { kind: 'schedule'; keywords: string[] }
  | { kind: 'exclude-keywords'; type: 'info'; keywords: string[] };

export interface NotificationRepository {
  findUserRole(userId: string): Promise<string | null>;
  list(
    userId: string,
    page: number,
    limit: number,
    filter: NotificationFilter
  ): Promise<NotificationListResult>;
  insert(input: CreateNotificationInput): Promise<NotificationRecord>;
  insertMany(inputs: CreateNotificationInput[]): Promise<NotificationRecord[]>;
  markRead(userId: string, notificationId: string): Promise<NotificationRecord | null>;
  markAllRead(userId: string): Promise<number>;
  
  // Settings & Email Digest methods
  getUserSettings(userId: string): Promise<UserNotificationSettings | null>;
  updateUserSettings(userId: string, settings: Partial<UserNotificationSettings>): Promise<UserNotificationSettings>;
  findUnsentEmailNotifications(userId: string): Promise<NotificationRecord[]>;
  markEmailsAsSent(notificationIds: string[]): Promise<void>;
  findUsersForDigest(currentHour: string): Promise<{ id: string; email: string; email_digest_time: string }[]>;
}
