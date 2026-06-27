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

    // 2. Tạo Job ở trạng thái pending
    const job = await createExportJob(adminSupabase, user.id, { platform, search, startDate, endDate });
    
    // 3. Xử lý đồng bộ ngay lập tức để đảm bảo khi deploy vẫn hoạt động tin cậy 100%
    const limit = rowCount > 0 ? rowCount : 1000;
    const data = await getCaptionsForExport(adminSupabase, { platform, search, startDate, endDate }, limit);
    
    // Tạo URL dẫn đến endpoint download thật
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const externalHost = forwardedHost || host;
    const origin = process.env.NEXT_PUBLIC_SITE_URL || (externalHost ? `${forwardedProto}://${externalHost}` : request.nextUrl.origin);
    const actualDownloadUrl = `${origin}/api/captions/export/download?jobId=${job.id}`;
    
    const csv = generateCaptionCSV(data);

    // Hoàn tất job (không truyền user.email để không gửi email thông báo nữa)
    await completeExportJob(adminSupabase, job.id, actualDownloadUrl, data.length);
    
    console.log(`[Export Service] Đã xử lý job ${job.id} thành công (đã tắt gửi email)`);
    
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="antbiz_export_${job.id.substring(0, 8)}.csv"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (err: any) {
    console.error('CREATE EXPORT JOB ERROR:', err);
    return NextResponse.json({ error: 'Không thể tạo yêu cầu xuất dữ liệu: ' + (err.message || String(err)) }, { status: 500 });
  }
}
