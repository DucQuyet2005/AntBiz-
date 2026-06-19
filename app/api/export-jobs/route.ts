import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { listExportJobs, completeExportJob } from '@/lib/api/services/exportService';

/**
 * GET /api/export-jobs
 * 
 * Lists export jobs for the current user.
 */
export async function GET(request: NextRequest) {
  const { user, unauthorized } = await requireUserWithRole([
    'admin',
    'marketer_full',
    'marketer_content',
  ]);
  if (unauthorized) return unauthorized;

  try {
    const adminSupabase = createAdminClient();
    const jobs = await listExportJobs(adminSupabase, user.id);
    return NextResponse.json({ data: jobs });
  } catch (err: any) {
    console.error('[GET /api/export-jobs] error:', err);
    return NextResponse.json({ error: 'Không thể lấy danh sách yêu cầu xuất dữ liệu' }, { status: 500 });
  }
}

/**
 * POST /api/export-jobs
 * 
 * Mocks completion of an export job (Demo).
 */
export async function POST(request: NextRequest) {
  const { user, unauthorized } = await requireUserWithRole([
    'admin',
    'marketer_full',
    'marketer_content',
  ]);
  if (unauthorized) return unauthorized;

  try {
    const { jobId } = await request.json();
    if (!jobId) {
      return NextResponse.json({ error: 'Thiếu jobId' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const origin = request.nextUrl.origin;
    const downloadUrl = `${origin}/api/test/download-csv?jobId=${jobId}`;
    
    // Complete the job with mock row count of 15 and send an email
    await completeExportJob(adminSupabase, jobId, downloadUrl, 15, user.email);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[POST /api/export-jobs] error:', err);
    return NextResponse.json({ error: 'Không thể hoàn tất yêu cầu xuất dữ liệu: ' + (err.message || String(err)) }, { status: 500 });
  }
}

