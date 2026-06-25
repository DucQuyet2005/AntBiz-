import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/reset-password'
  
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'http'
  const host = request.headers.get('host')
  const externalHost = forwardedHost || host
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (externalHost ? `${forwardedProto}://${externalHost}` : request.nextUrl.origin)
  
  const redirectTo = new URL(next, siteUrl)

  if (token_hash && type) {
    const supabase = createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      return NextResponse.redirect(redirectTo)
    }
  }

  // Chuyển hướng đến trang lỗi nếu xác thực thất bại
  redirectTo.pathname = '/login'
  redirectTo.searchParams.set('error', 'Link xác thực không hợp lệ hoặc đã hết hạn.')
  return NextResponse.redirect(redirectTo)
}
