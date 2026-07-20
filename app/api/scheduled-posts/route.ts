import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildScheduledPublishingModule,
  scheduledPublishingErrorResponse,
  SCHEDULED_PUBLISHING_ROLES,
} from './_adapter';

export async function GET(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUserWithRole(SCHEDULED_PUBLISHING_ROLES);
  if (unauthorized) return unauthorized;
  try {
    const triggerSource = request.nextUrl.searchParams.get('trigger_source') || undefined;
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const data = await buildScheduledPublishingModule(supabase).list({
      triggerSource,
      limit,
      creatorId: triggerSource === 'extension' ? user.id : undefined,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return scheduledPublishingErrorResponse(error, '[GET /api/scheduled-posts]');
  }
}

export async function POST(request: NextRequest) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(
    SCHEDULED_PUBLISHING_ROLES
  );
  if (unauthorized) return unauthorized;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 }); }
  try {
    const result = await buildScheduledPublishingModule(supabase).schedule(
      { userId: user.id, role }, body
    );
    return NextResponse.json({ data: result.post }, { status: result.status });
  } catch (error) {
    return scheduledPublishingErrorResponse(error, '[POST /api/scheduled-posts]');
  }
}
