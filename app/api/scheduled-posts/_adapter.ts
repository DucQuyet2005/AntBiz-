import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createScheduledPublishingModule } from '@/backend/modules/scheduled-publishing/scheduled-publishing-factory';
import {
  ScheduledPublishingError,
  ScheduledPublishingRepositoryError,
} from '@/backend/modules/scheduled-publishing/errors';

export const SCHEDULED_PUBLISHING_ROLES = [
  'admin', 'marketer_full', 'marketer_content',
] satisfies ('admin' | 'marketer_full' | 'marketer_content')[];

export function buildScheduledPublishingModule(supabase: SupabaseClient) {
  return createScheduledPublishingModule(supabase);
}

export function scheduledPublishingErrorResponse(error: unknown, logLabel: string) {
  if (error instanceof ScheduledPublishingError) {
    if (error.status >= 500) console.error(logLabel, error.cause || error);
    return NextResponse.json({ error: error.clientMessage }, { status: error.status });
  }
  if (error instanceof ScheduledPublishingRepositoryError) {
    console.error(logLabel, error.cause);
    return NextResponse.json({ error: 'Không thể xử lý lịch đăng bài' }, { status: 500 });
  }
  console.error(logLabel, error);
  return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
}
