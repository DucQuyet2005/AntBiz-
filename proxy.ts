import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Khởi tạo Supabase client trong Middleware để tự động đọc & cập nhật JWT Token từ Cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Kiểm tra Session (Chứa JWT Token giải mã) từ Cookie
  const { data: { session } } = await supabase.auth.getSession()

  const url = request.nextUrl.clone()

  const isPublicRoute = url.pathname === '/login' || url.pathname === '/register' || url.pathname.startsWith('/api/auth');

  // 1. Nếu người dùng ĐÃ ĐĂNG NHẬP (Có JWT Session hợp lệ) mà cố tình truy cập trang login/register
  if (session && (url.pathname === '/login' || url.pathname === '/register')) {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // 2. Nếu người dùng CHƯA ĐĂNG NHẬP (Không có JWT Session) mà cố tình truy cập các trang được bảo vệ (tất cả trừ public)
  if (!session && !isPublicRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}

// Chỉ áp dụng Middleware này cho các route cụ thể để tối ưu hiệu năng
export const config = {
  matcher: [
    /*
     * Khớp tất cả các request ngoại trừ:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
