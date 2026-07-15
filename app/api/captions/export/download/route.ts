import { NextRequest } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildCaptionExportModule,
  CAPTION_EXPORT_ROLES,
  captionExportTextErrorResponse,
} from '../_adapter';

export async function GET(request: NextRequest) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(CAPTION_EXPORT_ROLES);
  if (unauthorized) return unauthorized;

  try {
    const artifact = await buildCaptionExportModule(supabase).download(
      { id: user.id, role },
      request.nextUrl.searchParams.get('jobId')
    );
    return new Response(artifact.csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${artifact.filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return captionExportTextErrorResponse(error, '[GET /api/captions/export/download]');
  }
}
