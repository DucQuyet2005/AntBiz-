import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';

/**
 * GET /api/linked-accounts
 * Trả về danh sách tài khoản đã liên kết của user hiện tại.
 */
export async function GET(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from('linked_accounts')
    .select('id, platform, account_id, account_name, expires_at, created_at')
    .eq('user_id', user.id);

  if (error) {
    console.error('[GET /api/linked-accounts] error:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách tài khoản liên kết' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

/**
 * DELETE /api/linked-accounts
 * Hủy liên kết một tài khoản mạng xã hội của user.
 */
export async function DELETE(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get('platform');

  if (!platform) {
    return NextResponse.json({ error: 'Thiếu platform cần hủy liên kết' }, { status: 400 });
  }

  // Chuyển 'threads' sang 'thread' để map với Database
  const dbPlatform = platform === 'threads' ? 'thread' : platform;

  const { error } = await supabase
    .from('linked_accounts')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', dbPlatform);

  if (error) {
    console.error('[DELETE /api/linked-accounts] error:', error);
    return NextResponse.json({ error: 'Lỗi khi hủy liên kết tài khoản' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Đã hủy liên kết thành công' });
}
