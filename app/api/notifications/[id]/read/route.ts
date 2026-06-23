import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api/auth';

// PUT /api/notifications/[id]/read - Đánh dấu một thông báo là đã đọc
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Mã thông báo không hợp lệ' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error(`[PUT /api/notifications/${id}/read] Supabase error:`, error);
      return NextResponse.json({ error: 'Không thể đánh dấu thông báo đã đọc' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[PUT /api/notifications/[id]/read] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
