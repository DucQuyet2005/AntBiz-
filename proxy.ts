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

  const isPublicRoute = 
    url.pathname === '/login' || 
    url.pathname === '/register' || 
    url.pathname === '/forgot-password' || 
    url.pathname === '/reset-password' || 
    url.pathname.startsWith('/api/auth') || 
    url.pathname.startsWith('/api/proxy') || 
    url.pathname.startsWith('/api/scrape');

  // Lấy và kiểm tra thông tin user profile trong database
  let profileExists = false;
  let isLocked = false;

  if (session) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('status')
      .eq('id', session.user.id)
      .maybeSingle();

    if (userProfile) {
      profileExists = true;
      if (userProfile.status === 'locked') {
        isLocked = true;
      }
    }
  }

  // Nếu người dùng có session nhưng không có profile trong public.users (tài khoản cũ trước khi chạy schema) hoặc bị khóa
  if (session && (!profileExists || isLocked)) {
    // Đăng xuất session hiện tại khỏi Supabase
    await supabase.auth.signOut()

    url.pathname = '/login'
    url.searchParams.set('error', !profileExists ? 'no_profile' : 'locked')

    const redirectResponse = NextResponse.redirect(url)

    // Xóa cookie thủ công để đảm bảo dọn sạch
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] || ''
    if (projectRef) {
      redirectResponse.cookies.delete(`sb-${projectRef}-auth-token`)
      redirectResponse.cookies.delete(`sb-${projectRef}-auth-token.0`)
      redirectResponse.cookies.delete(`sb-${projectRef}-auth-token.1`)
    }
    return redirectResponse;
  }

  // 1. Nếu người dùng ĐÃ ĐĂNG NHẬP và hợp lệ (có profile và không khóa) mà cố tình truy cập trang login/register
  if (session && profileExists && !isLocked && (url.pathname === '/login' || url.pathname === '/register')) {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // 2. Nếu người dùng CHƯA ĐĂNG NHẬP hoặc không có profile hợp lệ mà cố tình truy cập các trang được bảo vệ (tất cả trừ public)
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
