import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api/auth';

// PUT /api/notifications/read-all - Đánh dấu tất cả thông báo của user hiện tại là đã đọc
export async function PUT(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .select();

    if (error) {
      console.error('[PUT /api/notifications/read-all] Supabase error:', error);
      return NextResponse.json({ error: 'Không thể đánh dấu tất cả thông báo đã đọc' }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data?.length || 0 });
  } catch (err: any) {
    console.error('[PUT /api/notifications/read-all] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
