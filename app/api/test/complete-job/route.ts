import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { completeExportJob } from '@/lib/api/services/exportService';

/**
 * POST /api/test/complete-job
 * 
 * MOCK endpoint for demo purposes.
 * Simulates a background worker finishing a job and sending an email.
 */
export async function POST(request: NextRequest) {
  try {
    const { jobId, userEmail } = await request.json();
    const adminSupabase = createAdminClient();

    if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });

    // Use the actual internal endpoint that serves a CSV stream
    const origin = request.nextUrl.origin;
    const actualDownloadUrl = `${origin}/api/test/download-csv?jobId=${jobId}`;
    const mockRowCount = 1250;

    await completeExportJob(adminSupabase, jobId, actualDownloadUrl, mockRowCount, userEmail);

    return NextResponse.json({ success: true, message: 'Job completed and email sent (mocked).' });
  } catch (err: any) {
    console.error('[POST /api/test/complete-job] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
