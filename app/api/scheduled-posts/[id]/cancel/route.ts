import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  // Tìm kiếm bài đăng đã lên lịch
  const { data: post, error: fetchError } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !post) {
    return NextResponse.json({ error: 'Không tìm thấy lịch đăng bài' }, { status: 404 });
  }

  // Kiểm tra phân quyền: chỉ có người tạo lịch hoặc quản trị viên (admin) mới được hủy
  if (role !== 'admin' && post.created_by !== user.id) {
    return NextResponse.json({ error: 'Bạn không có quyền hủy lịch đăng bài này' }, { status: 403 });
  }

  // Kiểm tra trạng thái: chỉ cho phép hủy nếu lịch đăng đang ở trạng thái 'pending' (chờ đăng)
  if (post.status !== 'pending') {
    return NextResponse.json(
      { error: `Không thể hủy lịch đăng bài ở trạng thái: ${post.status}` },
      { status: 400 }
    );
  }

  // Cập nhật trạng thái lịch đăng bài thành 'cancelled' (đã hủy)
  const { error: updateError } = await supabase
    .from('scheduled_posts')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (updateError) {
    console.error(`[CANCEL /api/scheduled-posts/${id}] update error:`, updateError);
    return NextResponse.json({ error: 'Không thể cập nhật trạng thái lịch đăng' }, { status: 500 });
  }

  // Khôi phục trạng thái caption tương ứng về lại 'approved' (đã phê duyệt)
  if (post.caption_id) {
    await supabase
      .from('captions')
      .update({ status: 'approved' })
      .eq('id', post.caption_id);
  }

  return NextResponse.json({ success: true, message: 'Đã hủy lịch đăng bài thành công' });
}
