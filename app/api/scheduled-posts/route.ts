import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { initScheduler } from '@/lib/scheduler/scheduler';

// Khởi chạy trình chạy ngầm scheduler
// [ĐÃ COMMENT ĐỂ DEPLOY LÊN VERCEL] initScheduler();

// GET /api/scheduled-posts - Lấy danh sách bài đăng đã lên lịch
export async function GET(request: NextRequest) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  let query = supabase
    .from('scheduled_posts')
    .select('*, captions(id, ai_content, edited_content, platform, articles(id, title, category, description))')
    .order('scheduled_at', { ascending: true });

  if (role !== 'admin' && user) {
    query = query.eq('created_by', user.id);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[GET /api/scheduled-posts] Supabase error:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách lịch đăng bài' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST /api/scheduled-posts - Tạo mới một lịch đăng bài
export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 });
  }

  const { captionId, scheduledAt, imageUrls } = body;

  if (!captionId || !scheduledAt) {
    return NextResponse.json({ error: 'Thiếu thông tin captionId hoặc scheduledAt' }, { status: 400 });
  }

  const scheduledTime = new Date(scheduledAt);
  if (isNaN(scheduledTime.getTime())) {
    return NextResponse.json({ error: 'Thời gian lên lịch không hợp lệ' }, { status: 400 });
  }

  if (scheduledTime.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Chỉ được phép lên lịch đăng bài cho thời gian trong tương lai' }, { status: 400 });
  }

  // Xác minh caption tồn tại và lấy nền tảng
  const { data: caption, error: captionError } = await supabase
    .from('captions')
    .select('*')
    .eq('id', captionId)
    .maybeSingle();

  if (captionError || !caption) {
    return NextResponse.json({ error: 'Không tìm thấy caption tương ứng' }, { status: 404 });
  }

  // Thêm lịch đăng bài vào cơ sở dữ liệu
  const { data: scheduledPost, error: dbError } = await supabase
    .from('scheduled_posts')
    .insert({
      caption_id: captionId,
      created_by: user.id,
      platform: caption.platform,
      status: 'pending',
      scheduled_at: scheduledTime.toISOString(),
      image_urls: imageUrls || [],
    })
    .select()
    .single();

  if (dbError) {
    console.error('[POST /api/scheduled-posts] Save error:', dbError);
    return NextResponse.json({ error: 'Không thể lưu lịch đăng bài vào cơ sở dữ liệu' }, { status: 500 });
  }

  // Cập nhật trạng thái caption thành 'scheduled'
  await supabase
    .from('captions')
    .update({ status: 'scheduled' })
    .eq('id', captionId);

  return NextResponse.json({ data: scheduledPost }, { status: 201 });
}
