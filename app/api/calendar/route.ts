import { NextRequest, NextResponse } from 'next/server';
import { parseCalendarFilters } from '@/backend/modules/scheduled-publishing/scheduled-publishing-schemas';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildScheduledPublishingModule,
  scheduledPublishingErrorResponse,
  SCHEDULED_PUBLISHING_ROLES,
} from '../scheduled-posts/_adapter';

export async function GET(request: NextRequest) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(SCHEDULED_PUBLISHING_ROLES);
  if (unauthorized) return unauthorized;
  try {
    let filters = parseCalendarFilters(new URL(request.url).searchParams);
    if (role === 'marketer_content') {
      filters = { ...filters, creatorId: user.id };
    }
    const data = await buildScheduledPublishingModule(supabase).calendarEvents(filters);
    return NextResponse.json({ data });
  } catch (error) {
    return scheduledPublishingErrorResponse(error, '[GET /api/calendar]');
  }
}
