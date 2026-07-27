import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildScheduledPublishingModule,
  scheduledPublishingErrorResponse,
  SCHEDULED_PUBLISHING_ROLES,
} from '../_adapter';

export async function PUT(request: NextRequest) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(
    SCHEDULED_PUBLISHING_ROLES
  );
  if (unauthorized) return unauthorized;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 }); }
  try {
    const data = await buildScheduledPublishingModule(supabase).bulkReschedule(
      { userId: user.id, role }, body
    );
    return NextResponse.json({ data });
  } catch (error) {
    return scheduledPublishingErrorResponse(error, '[PUT /api/scheduled-posts/bulk-reschedule]');
  }
}

export { PUT as PATCH };
