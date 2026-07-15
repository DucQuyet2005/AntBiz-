import { NextRequest, NextResponse } from 'next/server';
import { parseCalendarFilters } from '@/backend/modules/scheduled-publishing/scheduled-publishing-schemas';
import {
  createServiceRoleClient,
  getCalendarToken,
  requireUserWithRole,
} from '@/lib/api/auth';
import {
  buildScheduledPublishingModule,
  scheduledPublishingErrorResponse,
  SCHEDULED_PUBLISHING_ROLES,
} from '../../../scheduled-posts/_adapter';

export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const token = searchParams.get('token');
  const userId = searchParams.get('userId');
  let supabase;
  let creatorId: string | undefined;

  if (userId && token && token === getCalendarToken(userId)) {
    supabase = createServiceRoleClient();
    creatorId = userId;
  } else {
    const auth = await requireUserWithRole(SCHEDULED_PUBLISHING_ROLES);
    if (auth.unauthorized) return auth.unauthorized;
    supabase = auth.supabase;
  }

  try {
    const filters = { ...parseCalendarFilters(searchParams), creatorId };
    const body = await buildScheduledPublishingModule(supabase).calendarIcal(filters);
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="calendar.ics"',
      },
    });
  } catch (error) {
    return scheduledPublishingErrorResponse(error, '[GET /api/calendar/export/ical]');
  }
}
