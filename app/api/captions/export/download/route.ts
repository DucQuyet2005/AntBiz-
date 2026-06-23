import { NextRequest } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getCaptionsForExport, generateCaptionCSV } from '@/lib/api/services/exportService';

/**
 * GET /api/captions/export/download
 * 
 * Lấy job từ bảng audit_logs dựa trên jobId, sử dụng bộ lọc thực tế của job đó
 * để truy vấn captions thực và trả về file CSV tải xuống.
 */
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');
  if (!jobId) {
    return new Response('Thiếu mã yêu cầu (jobId).', { status: 400 });
  }

  try {
    const adminSupabase = createAdminClient();
    
    // Lấy thông tin job từ bảng audit_logs
    const { data: job, error: jobError } = await adminSupabase
      .from('audit_logs')
      .select('after_value')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('[Download CSV] Job not found or error:', jobError);
      return new Response('Không tìm thấy yêu cầu xuất dữ liệu tương ứng.', { status: 404 });
    }

    const filters = job.after_value?.filters || {};
    const rowCount = job.after_value?.row_count || 1000;

    // Lấy captions thực tế theo đúng bộ lọc của job
    const data = await getCaptionsForExport(adminSupabase, filters, rowCount);
    const csv = generateCaptionCSV(data);
    
    // Trả về response dạng file tải xuống
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="antbiz_export_${jobId.substring(0, 8)}.csv"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[Download CSV Error]', err);
    return new Response('Đã xảy ra lỗi khi tạo file tải về.', { status: 500 });
  }
}
