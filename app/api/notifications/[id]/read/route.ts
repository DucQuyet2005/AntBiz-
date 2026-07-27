import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api/auth';
import {
  buildNotificationModule,
  notificationErrorResponse,
} from '../../_adapter';

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  try {
    const { id } = await params;
    const data = await buildNotificationModule(supabase).markRead(user.id, id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return notificationErrorResponse(
      error, '[PUT /api/notifications/[id]/read]',
      'Không thể đánh dấu thông báo đã đọc'
    );
  }
}
