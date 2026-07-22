import { NextRequest } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import {
  buildScheduledPublishingModule,
  scheduledPublishingErrorResponse,
} from '../_adapter';

export async function GET(request: NextRequest) {
  try {
    let supabase;
    const authHeader = request.headers.get('authorization');
    
    // Check if user is logged in via browser session
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();

    if (user) {
      supabase = userClient;
    } else {
      // For external calendar crawlers (e.g. Google Calendar bot), use admin client
      supabase = createAdminClient();
    }

    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from') || searchParams.get('startDate') || undefined;
    const to = searchParams.get('to') || searchParams.get('endDate') || undefined;
    const platformParam = searchParams.get('platform') || searchParams.get('platforms') || undefined;
    const platforms = platformParam ? platformParam.split(',') : undefined;

    const module = buildScheduledPublishingModule(supabase);
    const icalContent = await module.calendarIcal({
      from,
      to,
      platforms,
    });

    return new Response(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="antbiz_calendar.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return scheduledPublishingErrorResponse(error, '[GET /api/scheduled-posts/ical]');
  }
}
