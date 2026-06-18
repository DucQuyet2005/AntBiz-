import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { listExportJobs } from '@/lib/api/services/exportService';

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
