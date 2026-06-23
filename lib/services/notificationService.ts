import { createAdminClient } from '@/utils/supabase/admin';

export type NotificationType = 'post_success' | 'post_failed' | 'ab_test_complete' | 'info';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: any;
}

/**
 * Tạo thông báo mới trong hệ thống (in-app notification).
 * Sử dụng client admin để ghi trực tiếp qua mặt RLS.
 */
export async function createNotification(input: CreateNotificationInput) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error('[NotificationService] Lỗi khi tạo thông báo:', error.message);
    throw error;
  }

  return data;
}

/**
 * Tạo nhiều thông báo mới cùng lúc trong hệ thống (bulk insert).
 * Giúp tăng tốc độ xử lý khi cần thông báo cho nhiều Admin.
 */
export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (!inputs || inputs.length === 0) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('notifications')
    .insert(inputs.map(input => ({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata || {},
    })))
    .select();

  if (error) {
    console.error('[NotificationService] Lỗi khi tạo nhiều thông báo:', error.message);
    throw error;
  }

  return data || [];
}
