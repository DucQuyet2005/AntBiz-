import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildLinkedAccountConnectionsModule,
  SOCIAL_CONNECTION_ROLES,
  socialConnectionJsonErrorResponse,
} from './_adapter';

export async function GET(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUserWithRole(SOCIAL_CONNECTION_ROLES);
  if (unauthorized) return unauthorized;
  try {
    const data = await buildLinkedAccountConnectionsModule(
      supabase,
      request.nextUrl.origin
    ).list(user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return socialConnectionJsonErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUserWithRole(SOCIAL_CONNECTION_ROLES);
  if (unauthorized) return unauthorized;
  try {
    await buildLinkedAccountConnectionsModule(supabase, request.nextUrl.origin).disconnect(
      user.id,
      request.nextUrl.searchParams.get('platform')
    );
    return NextResponse.json({ success: true, message: 'Đã hủy liên kết thành công' });
  } catch (error) {
    return socialConnectionJsonErrorResponse(error);
  }
}
