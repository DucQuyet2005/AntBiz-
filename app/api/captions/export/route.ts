import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { 
  getCaptionsForExport, 
  generateCaptionCSV, 
  createExportJob,
  completeExportJob
} from '@/lib/api/services/exportService';

/**
 * GET /api/captions/export
 * 
 * Luôn luôn xuất CSV thông qua Background Job và gửi qua Email,
 * bất kể số lượng dòng là bao nhiêu, đúng theo yêu cầu PO.
 */
export async function GET(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUserWithRole([
    'admin',
    'marketer_full',
    'marketer_content',
  ]);
  if (unauthorized) return unauthorized;

  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get('platform') || undefined;
  const search = searchParams.get('search') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  // 1. Đếm số lượng record (Vẫn dùng client của user để đảm bảo quyền đọc captions nếu có)
  let countQuery = supabase
    .from('captions')
    .select('*', { count: 'exact', head: true });

  if (platform && platform !== 'All Platforms') {
    countQuery = countQuery.eq('platform', platform.toLowerCase());
  }
  if (search) {
    countQuery = countQuery.or(`ai_content.ilike.%${search}%,edited_content.ilike.%${search}%`);
  }
  if (startDate) {
    countQuery = countQuery.gte('created_at', startDate);
  }
  if (endDate) {
    countQuery = countQuery.lte('created_at', endDate);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error('[GET /api/captions/export] count error:', countError);
    return NextResponse.json({ error: 'Không thể đếm số lượng bản ghi' }, { status: 500 });
  }

  const rowCount = count || 0;

  try {
    const adminSupabase = createAdminClient();

    // 2. Luôn tạo Job (Dù ít hay nhiều dòng) - Dùng adminSupabase để bypass RLS của audit_logs
    const job = await createExportJob(adminSupabase, user.id, { platform, search, startDate, endDate });
    
    // 3. Xử lý nền (Background Worker giả lập)
    // Không await để API phản hồi ngay lập tức
    (async () => {
      try {
        // Giả lập thời gian xử lý (để thấy trạng thái Pending chuyển sang Completed)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Lấy dữ liệu và tạo CSV
        const limit = rowCount > 0 ? rowCount : 1000;
        const data = await getCaptionsForExport(adminSupabase, { platform, search, startDate, endDate }, limit);
        
        // Tạo URL dẫn đến endpoint download thật (bắt trình duyệt tải file)
        const origin = request.nextUrl.origin;
        const actualDownloadUrl = `${origin}/api/test/download-csv?jobId=${job.id}`;
        
        // Hoàn tất job và tự động GỬI EMAIL tới user
        await completeExportJob(adminSupabase, job.id, actualDownloadUrl, data.length, user.email);
        
        console.log(`[Export Worker] Đã xử lý job ${job.id} và gửi email tới ${user.email}`);
      } catch (err) {
        console.error(`[Export Worker] Lỗi xử lý job ${job.id}:`, err);
        const { data: existingJob } = await adminSupabase.from('audit_logs').select('after_value').eq('id', job.id).single();
        await adminSupabase.from('audit_logs').update({ 
          after_value: { ...(existingJob?.after_value || {}), status: 'failed', error_message: String(err) }
        }).eq('id', job.id);
      }
    })();
    
    return NextResponse.json({ 
      message: 'Đã tiếp nhận yêu cầu xuất dữ liệu. File CSV sẽ được gửi qua email của bạn.',
      job_id: job.id,
      status: 'pending',
      rowCount
    }, { status: 202 }); // Accepted

  } catch (err: any) {
    console.error('CREATE EXPORT JOB ERROR:', err);
    return NextResponse.json({ error: 'Không thể tạo yêu cầu xuất dữ liệu: ' + (err.message || String(err)) }, { status: 500 });
  }
}
