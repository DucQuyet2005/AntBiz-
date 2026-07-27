import { NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildCaptionExportModule,
  CAPTION_EXPORT_ROLES,
  captionExportJsonErrorResponse,
} from '../captions/export/_adapter';

export async function GET() {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(CAPTION_EXPORT_ROLES);
  if (unauthorized) return unauthorized;

  try {
    const jobs = await buildCaptionExportModule(supabase).list({ id: user.id, role });
    return NextResponse.json({ data: jobs });
  } catch (error) {
    return captionExportJsonErrorResponse(error, '[GET /api/export-jobs]');
  }
}
