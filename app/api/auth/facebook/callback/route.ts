import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;

  const state = searchParams.get('state') || 'facebook';

  if (error || !code) {
    console.error('[Facebook Callback] OAuth error:', error);
    return NextResponse.redirect(`${origin}/settings?connected=failed&platform=${state}&error=${encodeURIComponent(error || 'Missing code')}`);
  }

  const appId = process.env.FB_APP_ID || '';
  const appSecret = process.env.FB_APP_SECRET || '';
  const redirectUri = process.env.FB_REDIRECT_URI || `${origin}/api/auth/facebook/callback`;

  if (!appId || !appSecret) {
    return NextResponse.redirect(`${origin}/settings?connected=failed&platform=facebook&error=${encodeURIComponent('App configuration missing')}`);
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    // 1. Đổi code lấy User Access Token ngắn hạn
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(tokenData.error?.message || 'Lỗi trao đổi access token');
    }

    const shortToken = tokenData.access_token;

    // 2. Đổi User Token ngắn hạn lấy User Token dài hạn (60 ngày)
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
    );
    const longTokenData = await longTokenRes.json();
    if (!longTokenRes.ok) {
      throw new Error(longTokenData.error?.message || 'Lỗi lấy User Access Token dài hạn');
    }

    const userLongToken = longTokenData.access_token;

    // 3. Quét danh sách Pages của người dùng
    const accountsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${userLongToken}`
    );
    const accountsData = await accountsRes.json();
    if (!accountsRes.ok) {
      throw new Error(accountsData.error?.message || 'Không thể lấy danh sách Pages');
    }

    const pages = accountsData.data || [];
    if (pages.length === 0) {
      throw new Error('Tài khoản Facebook này không quản lý Page nào.');
    }

    let instagramLinkedCount = 0;

    // 4. Lưu từng Page và quét Instagram Business tương ứng
    for (const page of pages) {
      // Lưu Facebook Page vào database
      await supabase.from('linked_accounts').upsert({
        user_id: user.id,
        platform: 'facebook',
        account_id: page.id,
        account_name: page.name,
        access_token: page.access_token, // Đây là Page Access Token không hết hạn
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,platform,account_id'
      });

      // Thử tìm Instagram Business Account được liên kết với Page này
      try {
        const igRes = await fetch(
          `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );
        const igData = await igRes.json();
        if (igRes.ok && igData.instagram_business_account?.id) {
          const igAccountId = igData.instagram_business_account.id;

          // Lấy profile username của Instagram
          const igProfileRes = await fetch(
            `https://graph.facebook.com/v19.0/${igAccountId}?fields=username&access_token=${page.access_token}`
          );
          const igProfileData = await igProfileRes.json();
          const igUsername = igProfileRes.ok ? igProfileData.username : `IG_Account_${igAccountId}`;

          // Lưu tài khoản Instagram vào linked_accounts
          await supabase.from('linked_accounts').upsert({
            user_id: user.id,
            platform: 'instagram',
            account_id: igAccountId,
            account_name: `${igUsername} (qua Page: ${page.name})`,
            access_token: page.access_token, // Dùng Page Access Token để đăng bài lên Instagram liên kết
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,platform,account_id'
          });
          instagramLinkedCount++;
        }
      } catch (igErr) {
        console.warn(`[Facebook Callback] Lỗi quét Instagram cho Page ${page.name}:`, igErr);
      }
    }
    if (state === 'instagram' && instagramLinkedCount === 0) {
      return NextResponse.redirect(`${origin}/settings?connected=failed&platform=instagram&error=${encodeURIComponent('Không tìm thấy tài khoản Instagram Business nào liên kết với Trang Facebook của bạn.')}`);
    }

    return NextResponse.redirect(`${origin}/settings?connected=success&platform=${state}`);
  } catch (err: any) {
    console.error('[Facebook Callback] Process Error:', err);
    const state = request.nextUrl.searchParams.get('state') || 'facebook';
    return NextResponse.redirect(`${origin}/settings?connected=failed&platform=${state}&error=${encodeURIComponent(err.message || 'Unknown')}`);
  }
}
