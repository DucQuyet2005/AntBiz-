import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { createNotification } from '@/lib/services/notificationService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 });
  }

  const { scheduledAt } = body;
  if (!scheduledAt) {
    return NextResponse.json({ error: 'Thiếu thông tin scheduledAt' }, { status: 400 });
  }

  const scheduledTime = new Date(scheduledAt);
  if (isNaN(scheduledTime.getTime())) {
    return NextResponse.json({ error: 'Thời gian lên lịch không hợp lệ' }, { status: 400 });
  }

  // Cập nhật thời gian scheduled_at
  const { data: updatedPost, error: updateError } = await supabase
    .from('scheduled_posts')
    .update({
      scheduled_at: scheduledTime.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*, captions(id, articles(title))')
    .single();

  if (updateError || !updatedPost) {
    console.error('[PATCH /api/scheduled-posts/[id]] Reschedule error:', updateError);
    return NextResponse.json({ error: 'Không thể cập nhật lịch đăng bài' }, { status: 500 });
  }

  // Gửi thông báo in-app
  try {
    const articleTitle = (updatedPost as any).captions?.articles?.title || 'Bài viết không tên';
    const timeLabel = new Date(scheduledAt).toLocaleString('vi-VN');
    await createNotification({
      userId: user.id,
      type: 'info',
      title: 'Đã thay đổi lịch đăng bài',
      message: `Bài viết "${articleTitle}" đã được dời lịch đăng sang lúc ${timeLabel}.`,
      metadata: {
        post_id: updatedPost.id,
        scheduled_at: updatedPost.scheduled_at,
        platform: updatedPost.platform,
      }
    });
  } catch (err: any) {
    console.error('[PATCH /api/scheduled-posts/[id]] Lỗi tạo thông báo:', err.message);
  }

  return NextResponse.json({ data: updatedPost });
}
