import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { createNotification } from '@/lib/services/notificationService';

export async function PUT(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 });
  }

  const { ids, scheduledAt } = body;
  if (!ids || !Array.isArray(ids) || ids.length === 0 || !scheduledAt) {
    return NextResponse.json({ error: 'Thiếu thông tin ids hoặc scheduledAt' }, { status: 400 });
  }

  const scheduledTime = new Date(scheduledAt);
  if (isNaN(scheduledTime.getTime())) {
    return NextResponse.json({ error: 'Thời gian lên lịch không hợp lệ' }, { status: 400 });
  }

  // Update all specified pending posts
  const { data: updatedPosts, error: updateError } = await supabase
    .from('scheduled_posts')
    .update({
      scheduled_at: scheduledTime.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)
    .select('*, captions(id, articles(title))');

  if (updateError) {
    console.error('[PUT /api/scheduled-posts/bulk-reschedule] Reschedule error:', updateError);
    return NextResponse.json({ error: 'Không thể cập nhật lịch các bài đăng' }, { status: 500 });
  }

  // Create notifications for each updated post
  for (const post of (updatedPosts || [])) {
    try {
      const articleTitle = post.captions?.articles?.title || 'Bài viết không tên';
      const timeLabel = new Date(scheduledAt).toLocaleString('vi-VN');
      await createNotification({
        userId: user.id,
        type: 'info',
        title: 'Đã thay đổi lịch đăng bài',
        message: `Bài viết "${articleTitle}" đã được dời lịch đăng sang lúc ${timeLabel}.`,
        metadata: {
          post_id: post.id,
          scheduled_at: post.scheduled_at,
          platform: post.platform,
        }
      });
    } catch (err: any) {
      console.error('[PUT /api/scheduled-posts/bulk-reschedule] Lỗi tạo thông báo:', err.message);
    }
  }

  return NextResponse.json({ data: updatedPosts });
}

export { PUT as PATCH };
