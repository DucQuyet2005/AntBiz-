import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // query param "next" để điều hướng sau khi xác thực thành công
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createClient()
    // Đổi code lấy JWT Session và tự động lưu vào Cookies
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Trả về trang lỗi nếu xác thực thất bại
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
