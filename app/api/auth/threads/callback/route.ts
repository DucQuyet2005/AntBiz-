import { NextRequest, NextResponse } from 'next/server';
import { getThreadsAccessToken } from '@/lib/threads';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;

  if (error || !code) {
    console.error('[Threads Callback] OAuth error:', error);
    return NextResponse.redirect(`${origin}/settings?connected=failed&platform=threads&error=${encodeURIComponent(error || 'Missing code')}`);
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    // 1. Đổi code lấy access token dài hạn
    const accessToken = await getThreadsAccessToken(code);

    // 2. Lấy thông tin User Threads từ API để lấy ID và tên tài khoản
    const meRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`);
    const meData = await meRes.json();
    if (!meRes.ok) {
      throw new Error(meData.error?.message || 'Không thể lấy thông tin profile Threads');
    }

    // 3. Lưu thông tin vào linked_accounts
    const { error: dbError } = await supabase
      .from('linked_accounts')
      .upsert({
        user_id: user.id,
        platform: 'thread',
        account_id: meData.id,
        account_name: meData.username,
        access_token: accessToken,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,platform,account_id'
      });

    if (dbError) {
      console.error('[Threads Callback] DB Error:', dbError);
      throw new Error('Lỗi lưu tài khoản liên kết vào cơ sở dữ liệu');
    }

    return NextResponse.redirect(`${origin}/settings?connected=success&platform=threads`);
  } catch (err: any) {
    console.error('[Threads Callback] Process Error:', err);
    return NextResponse.redirect(`${origin}/settings?connected=failed&platform=threads&error=${encodeURIComponent(err.message || 'Unknown')}`);
  }
}
