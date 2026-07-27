import { NextRequest, NextResponse } from 'next/server';
import { parseCalendarFilters } from '@/backend/modules/scheduled-publishing/scheduled-publishing-schemas';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildScheduledPublishingModule,
  scheduledPublishingErrorResponse,
  SCHEDULED_PUBLISHING_ROLES,
} from '../../../scheduled-posts/_adapter';

export async function GET(request: NextRequest) {
  const { supabase, unauthorized } = await requireUserWithRole(SCHEDULED_PUBLISHING_ROLES);
  if (unauthorized) return unauthorized;
  try {
    const body = await buildScheduledPublishingModule(supabase).calendarCsv(
      parseCalendarFilters(new URL(request.url).searchParams)
    );
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="calendar.csv"',
      },
    });
  } catch (error) {
    return scheduledPublishingErrorResponse(error, '[GET /api/calendar/export/csv]');
  }
}
