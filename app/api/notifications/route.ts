import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  buildNotificationModule,
  notificationErrorResponse,
} from './_adapter';

export async function GET(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  const searchParams = new URL(request.url).searchParams;
  try {
    const result = await buildNotificationModule(supabase).listInbox(user.id, {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      category: searchParams.get('category'),
      type: searchParams.get('type'),
    });
    return NextResponse.json(result);
  } catch (error) {
    return notificationErrorResponse(
      error, '[GET /api/notifications]', 'Không thể tải danh sách thông báo'
    );
  }
}

export async function POST(request: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isServiceRole = Boolean(
    serviceKey && request.headers.get('authorization') === `Bearer ${serviceKey}`
  );

  if (isServiceRole) {
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 }); }
    try {
      const data = await buildNotificationModule(createAdminClient()).createInternal(body);
      return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (error) {
      return notificationErrorResponse(error, '[POST /api/notifications service]');
    }
  }

  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 }); }
  try {
    const data = await buildNotificationModule(supabase).createForUser(user.id, body);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return notificationErrorResponse(error, '[POST /api/notifications]');
  }
}
