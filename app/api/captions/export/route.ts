import { NextRequest } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildCaptionExportModule,
  CAPTION_EXPORT_ROLES,
  captionExportJsonErrorResponse,
} from './_adapter';

export async function GET(request: NextRequest) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(CAPTION_EXPORT_ROLES);
  if (unauthorized) return unauthorized;

  try {
    const params = request.nextUrl.searchParams;
    const artifact = await buildCaptionExportModule(supabase).create(
      { id: user.id, role },
      {
        platform: params.get('platform'),
        search: params.get('search'),
        startDate: params.get('startDate'),
        endDate: params.get('endDate'),
      }
    );
    return new Response(artifact.csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${artifact.filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return captionExportJsonErrorResponse(error, '[GET /api/captions/export]');
  }
}
