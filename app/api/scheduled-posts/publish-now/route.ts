import { NextRequest, NextResponse } from 'next/server';
import { parsePublishNowInput } from '@/backend/modules/scheduled-publishing/scheduled-publishing-schemas';
import { ScheduledPublishingError } from '@/backend/modules/scheduled-publishing/errors';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildScheduledPublishingModule,
  scheduledPublishingErrorResponse,
  SCHEDULED_PUBLISHING_ROLES,
} from '../_adapter';

export async function POST(request: NextRequest) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(
    SCHEDULED_PUBLISHING_ROLES
  );
  if (unauthorized) return unauthorized;

  let body: unknown;
  try { body = await request.json(); }
  catch {
    return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 });
  }

  let input;
  try { input = parsePublishNowInput(body); }
  catch (error) {
    if (error instanceof ScheduledPublishingError) {
      return NextResponse.json({ error: error.clientMessage }, { status: error.status });
    }
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  }

  try {
    const data = await buildScheduledPublishingModule(supabase).publishNow(
      { userId: user.id, role },
      input
    );
    return NextResponse.json({ data });
  } catch (error) {
    return scheduledPublishingErrorResponse(
      error,
      '[POST /api/scheduled-posts/publish-now]'
    );
  }
}
