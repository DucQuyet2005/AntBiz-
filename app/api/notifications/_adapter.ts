import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { NotificationError, NotificationRepositoryError } from '@/backend/modules/notifications/errors';
import { createNotificationModule } from '@/backend/modules/notifications/notification-factory';

export function buildNotificationModule(supabase: SupabaseClient) {
  return createNotificationModule(supabase);
}

export function notificationErrorResponse(
  error: unknown,
  logLabel: string,
  fallbackMessage = 'Không thể xử lý thông báo'
) {
  if (error instanceof NotificationError) {
    return NextResponse.json({ error: error.clientMessage }, { status: error.status });
  }
  if (error instanceof NotificationRepositoryError) {
    console.error(logLabel, error.cause);
    return NextResponse.json({ error: fallbackMessage }, { status: 500 });
  }
  console.error(logLabel, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
