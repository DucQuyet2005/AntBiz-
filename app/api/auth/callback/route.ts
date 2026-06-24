import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // query param "next" để điều hướng sau khi xác thực thành công
  const next = searchParams.get('next') ?? '/overview'

  // Sử dụng biến môi trường NEXT_PUBLIC_SITE_URL nếu có, nếu không thì fallback về origin (cho local)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin

  if (code) {
    const supabase = createClient()
    // Đổi code lấy JWT Session và tự động lưu vào Cookies
    // Lưu ý: Luồng recovery từ admin.generateLink (server-side) không nên đi qua đây
    // vì sẽ thiếu code_verifier cho PKCE flow. Nên redirect trực tiếp về trang reset-password.
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data?.user) {
      // Sử dụng admin client để bypass RLS trên bảng users khi đồng bộ và update last_login_at
      const adminSupabase = createAdminClient()

      // Tự động kiểm tra và tạo/đồng bộ profile nếu bị thiếu
      const { data: profile } = await adminSupabase
        .from('users')
        .select('status')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!profile) {
        await adminSupabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email || '',
            role: 'marketer_content',
            status: 'active',
            last_login_at: new Date().toISOString()
          })
      } else if (profile.status === 'locked') {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${siteUrl}/login?error=locked`)
      } else {
        await adminSupabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id)
      }

      return NextResponse.redirect(`${siteUrl}${next}`)
    }
  }

  // Trả về trang lỗi nếu xác thực thất bại
  return NextResponse.redirect(`${siteUrl}/login?error=Could not authenticate user`)
}
