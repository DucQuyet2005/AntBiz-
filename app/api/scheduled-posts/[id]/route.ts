import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildScheduledPublishingModule,
  scheduledPublishingErrorResponse,
  SCHEDULED_PUBLISHING_ROLES,
} from '../_adapter';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(
    SCHEDULED_PUBLISHING_ROLES
  );
  if (unauthorized) return unauthorized;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 }); }
  try {
    const { id } = await params;
    const data = await buildScheduledPublishingModule(supabase).reschedule(
      { userId: user.id, role }, id, body
    );
    return NextResponse.json({ data });
  } catch (error) {
    return scheduledPublishingErrorResponse(error, '[PATCH /api/scheduled-posts/[id]]');
  }
}

export { PATCH as PUT };

