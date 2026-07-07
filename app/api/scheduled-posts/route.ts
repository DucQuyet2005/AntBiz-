import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { createNotification } from '@/lib/services/notificationService';

// GET /api/scheduled-posts - Lấy danh sách bài đăng đã lên lịch
export async function GET(request: NextRequest) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  let query = supabase
    .from('scheduled_posts')
    .select('*, captions(id, ai_content, edited_content, platform, articles(id, title, category, description))')
    .order('scheduled_at', { ascending: true });

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

  const { captionId, scheduledAt, imageUrls, mediaUrl } = body;

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
    .select('*, articles(title)')
    .eq('id', captionId)
    .maybeSingle();

  if (captionError || !caption) {
    return NextResponse.json({ error: 'Không tìm thấy caption tương ứng' }, { status: 404 });
  }

  // Validate Threads content length (<=500)
  const message = caption.edited_content || caption.ai_content || '';
  if ((caption.platform === 'thread' || caption.platform === 'threads') && message.length > 500) {
    return NextResponse.json({ error: 'Nội dung bài đăng Threads không được vượt quá 500 ký tự' }, { status: 400 });
  }

  // Validate Instagram content length (<=2200)
  if (caption.platform === 'instagram' && message.length > 2200) {
    return NextResponse.json({ error: 'Nội dung bài đăng Instagram không được vượt quá 2200 ký tự' }, { status: 400 });
  }

  // Validate Instagram mediaUrl (must be a valid http/https URL)
  const finalImageUrls = imageUrls || (mediaUrl ? [mediaUrl] : []);
  if (caption.platform === 'instagram') {
    if (finalImageUrls.length === 0) {
      return NextResponse.json({ error: 'Instagram yêu cầu một đường dẫn hình ảnh (mediaUrl) hợp lệ' }, { status: 400 });
    }
    try {
      const parsedUrl = new URL(finalImageUrls[0]);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error();
      }
    } catch {
      return NextResponse.json({ error: 'Instagram yêu cầu một đường dẫn hình ảnh (mediaUrl) hợp lệ' }, { status: 400 });
    }
  }

  // Kiểm tra xem caption này đã có lịch đăng chờ xử lý (pending) chưa
  const { data: existingPending, error: checkError } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('caption_id', captionId)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();

  if (checkError) {
    console.error('[POST /api/scheduled-posts] Check error:', checkError);
    return NextResponse.json({ error: 'Lỗi kiểm tra lịch đăng bài hiện tại' }, { status: 500 });
  }

  let scheduledPost: any;
  let dbError: any;
  let responseStatus = 201;

  if (existingPending) {
    // Cập nhật lại lịch đăng hiện tại thay vì tạo mới
    const { data: updatedPost, error: updateError } = await supabase
      .from('scheduled_posts')
      .update({
        scheduled_at: scheduledTime.toISOString(),
        image_urls: finalImageUrls,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingPending.id)
      .select()
      .single();

    scheduledPost = updatedPost;
    dbError = updateError;
    responseStatus = 200; // OK for update
  } else {
    // Thêm lịch đăng bài mới vào cơ sở dữ liệu
    const { data: insertedPost, error: insertError } = await supabase
      .from('scheduled_posts')
      .insert({
        caption_id: captionId,
        created_by: user.id,
        platform: caption.platform,
        status: 'pending',
        scheduled_at: scheduledTime.toISOString(),
        image_urls: finalImageUrls,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    scheduledPost = insertedPost;
    dbError = insertError;
    responseStatus = 201; // Created for insert
  }

  if (dbError) {
    console.error('[POST /api/scheduled-posts] Save error:', dbError);
    return NextResponse.json({ error: 'Không thể lưu lịch đăng bài vào cơ sở dữ liệu' }, { status: 500 });
  }

  // Cập nhật trạng thái caption thành 'scheduled'
  await supabase
    .from('captions')
    .update({ status: 'scheduled' })
    .eq('id', captionId);

  // Gửi thông báo in-app (Không ảnh hưởng main flow)
  try {
    const articleTitle = (caption as any).articles?.title || 'Bài viết không tên';
    const timeLabel = new Date(scheduledAt).toLocaleString('vi-VN');
    await createNotification({
      userId: user.id,
      type: 'info',
      title: 'Đã lên lịch bài đăng',
      message: `Bài viết "${articleTitle}" đã được lên lịch đăng tải thành công vào lúc ${timeLabel}.`,
      metadata: {
        post_id: scheduledPost.id,
        scheduled_at: scheduledPost.scheduled_at,
        platform: scheduledPost.platform,
      }
    });
  } catch (err: any) {
    console.error('[POST /api/scheduled-posts] Lỗi khi tạo thông báo in-app:', err.message);
  }

  return NextResponse.json({ data: scheduledPost }, { status: responseStatus });
}
