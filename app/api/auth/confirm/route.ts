import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/reset-password'
  
  const forwardedHost = request.headers ? request.headers.get('x-forwarded-host') : null
  const forwardedProto = (request.headers ? request.headers.get('x-forwarded-proto') : null) || 'http'
  const host = request.headers ? request.headers.get('host') : null
  const externalHost = forwardedHost || host
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (externalHost ? `${forwardedProto}://${externalHost}` : request.nextUrl.origin)
  
  // Ngăn chặn Open Redirect bằng cách kiểm tra nghiêm ngặt URL đích
  let safeNext = '/reset-password'
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    safeNext = next
  } else if (next) {
    try {
      const parsedNext = new URL(next, siteUrl)
      const parsedSite = new URL(siteUrl)
      if (parsedNext.host === parsedSite.host) {
        // Chỉ lấy đường dẫn tương đối để đảm bảo chuyển hướng cục bộ
        safeNext = parsedNext.pathname + parsedNext.search + parsedNext.hash
      }
    } catch {
      // Bỏ qua lỗi và sử dụng fallback mặc định
    }
  }

  const redirectTo = new URL(safeNext, siteUrl)

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
