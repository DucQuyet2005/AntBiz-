import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api/auth';
import {
  buildNotificationModule,
  notificationErrorResponse,
} from '../_adapter';

export async function GET() {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  try {
    const result = await buildNotificationModule(supabase).getUserSettings(user.id);
    return NextResponse.json(result);
  } catch (error) {
    return notificationErrorResponse(
      error, '[GET /api/notifications/settings]', 'Không thể tải cấu hình thông báo'
    );
  }
}

export async function PUT(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 }); }
  try {
    const result = await buildNotificationModule(supabase).updateUserSettings(user.id, body);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return notificationErrorResponse(
      error, '[PUT /api/notifications/settings]', 'Không thể cập nhật cấu hình thông báo'
    );
  }
}
