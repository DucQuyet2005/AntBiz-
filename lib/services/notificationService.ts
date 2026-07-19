import { createNotificationModule } from '@/backend/modules/notifications/notification-factory';
import type {
  CreateNotificationInput,
  NotificationType,
} from '@/backend/modules/notifications/notification-types';
import { createAdminClient } from '@/utils/supabase/admin';

export type { CreateNotificationInput, NotificationType };

export function createNotification(input: CreateNotificationInput) {
  return createNotificationModule(createAdminClient()).createInternal(input);
}

export function createNotifications(inputs: CreateNotificationInput[]) {
  if (!inputs?.length) return Promise.resolve([]);
  return createNotificationModule(createAdminClient()).createManyInternal(inputs);
}

export function getUserNotificationSettings(userId: string) {
  return createNotificationModule(createAdminClient()).getUserSettings(userId);
}
