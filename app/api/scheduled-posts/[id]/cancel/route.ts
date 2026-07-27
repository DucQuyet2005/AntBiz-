import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildScheduledPublishingModule,
  scheduledPublishingErrorResponse,
  SCHEDULED_PUBLISHING_ROLES,
} from '../../_adapter';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(
    SCHEDULED_PUBLISHING_ROLES
  );
  if (unauthorized) return unauthorized;
  try {
    const { id } = await params;
    const result = await buildScheduledPublishingModule(supabase).cancel(
      { userId: user.id, role }, id
    );
    return NextResponse.json(result);
  } catch (error) {
    return scheduledPublishingErrorResponse(error, '[POST /api/scheduled-posts/[id]/cancel]');
  }
}
