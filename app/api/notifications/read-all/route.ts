import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api/auth';
import {
  buildNotificationModule,
  notificationErrorResponse,
} from '../_adapter';

export async function PUT(_request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  try {
    const count = await buildNotificationModule(supabase).markAllRead(user.id);
    return NextResponse.json({ success: true, count });
  } catch (error) {
    return notificationErrorResponse(
      error, '[PUT /api/notifications/read-all]',
      'Không thể đánh dấu tất cả thông báo đã đọc'
    );
  }
}
