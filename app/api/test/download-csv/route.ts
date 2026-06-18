import { NextRequest } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getCaptionsForExport, generateCaptionCSV } from '@/lib/api/services/exportService';

/**
 * GET /api/test/download-csv
 * 
 * Endpoint này dùng để mô phỏng việc tải file trực tiếp (thay vì dẫn tới link S3).
 * Khi gọi tới đây, nó sẽ tạo trực tiếp một file CSV mẫu và bắt trình duyệt tải về ngay lập tức.
 */
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId') || 'demo';
  
  try {
    const adminSupabase = createAdminClient();
    
    // Lấy thử tối đa 100 dòng để tạo file CSV thật cho người dùng tải về trải nghiệm
    const data = await getCaptionsForExport(adminSupabase, {}, 100);
    const csv = generateCaptionCSV(data);
    
    // Tạo response bắt trình duyệt download thẳng thành file (attachment)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="antbiz_export_${jobId.substring(0, 8)}.csv"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err) {
    console.error('[Download CSV Error]', err);
    return new Response('Đã xảy ra lỗi khi tạo file tải về.', { status: 500 });
  }
}
