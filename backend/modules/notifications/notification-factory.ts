import type { SupabaseClient } from '@supabase/supabase-js';
import { NotificationModule } from './notification-module';
import { SupabaseNotificationRepository } from './notification-repository';

export function createNotificationModule(supabase: SupabaseClient) {
  return new NotificationModule(new SupabaseNotificationRepository(supabase));
}
