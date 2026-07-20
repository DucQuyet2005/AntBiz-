import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildScheduledPublishingModule,
  scheduledPublishingErrorResponse,
  SCHEDULED_PUBLISHING_ROLES,
} from './_adapter';

export async function GET(request: NextRequest) {
  const { supabase, unauthorized } = await requireUserWithRole(SCHEDULED_PUBLISHING_ROLES);
  if (unauthorized) return unauthorized;
  try {
    const searchParams = request.nextUrl.searchParams;
    const isPaginated = searchParams.get('paginated') === 'true';

    if (isPaginated) {
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      
      const platformsStr = searchParams.get('platforms');
      const platforms = platformsStr ? platformsStr.split(',') : undefined;
      
      const status = searchParams.get('status') || undefined;
      const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';

      const result = await buildScheduledPublishingModule(supabase).listPaginated(
        page, 
        limit, 
        { platforms, status, sortOrder }
      );
      return NextResponse.json(result);
    } else {
      // Original logic for Calendar View
      return NextResponse.json({ data: await buildScheduledPublishingModule(supabase).list() });
    }
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
