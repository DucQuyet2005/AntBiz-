export type NotificationType = 'post_success' | 'post_failed' | 'ab_test_complete' | 'info';
export type NotificationCategory = 'all' | 'bai-dang' | 'prompt' | 'lich' | 'he-thong';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: unknown;
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
}
