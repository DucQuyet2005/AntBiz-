import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ALLOWED_HOSTNAMES = [
  'gocnhinmoi.com.vn',
  'tuoitre.vn',
  'dantri.com.vn',
];

const ANTBIZ_API_ROUTES = new Set([
  'ab-tests', 'admin', 'auth', 'author-profiles', 'calendar', 'captions',
  'cron', 'export-jobs', 'generate-missing', 'landing-config', 'linked-accounts',
  'notifications', 'parse-doc', 'platform-presets', 'presets', 'prompt-configs',
  'prompts', 'proxy', 'scheduled-posts', 'scrape', 'screenshot', 'search',
  'stats', 'stt', 'translate', 'users'
]);

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_HOSTNAMES.some(
    (h) => hostname === h || hostname.endsWith('.' + h)
  );
}

function isActualAntBizRoute(pathname: string): boolean {
  if (pathname === '/') return true;

  const ANTBIZ_ROUTES = new Set([
    '/login', '/register', '/forgot-password', '/reset-password',
    '/overview', '/ai-creator', '/archive', '/content-calendar',
    '/faq', '/notifications', '/presets', '/profile', '/prompts',
    '/search', '/settings', '/admin',
  ]);

  if (ANTBIZ_ROUTES.has(pathname)) return true;

  if (pathname.startsWith('/api/')) {
    const segment = pathname.split('/')[2];
    return ANTBIZ_API_ROUTES.has(segment);
  }

  if (pathname.startsWith('/_next/')) {
    return true;
  }

  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Xử lý định tuyến và viết lại yêu cầu cho Proxy Iframe ────────────────
  if (!isActualAntBizRoute(pathname)) {
    // Chặn các request quảng cáo/tracker nội bộ của báo (như tuoitre native-content) để không gây rác log 400
    if (pathname.includes('native-content') || pathname.includes('googlesyndication') || pathname.includes('doubleclick')) {
      return new NextResponse(null, { status: 204 });
    }

    const referer = request.headers.get('referer');
    let isProxyRequest = false;
    let targetOrigin: string | null = null;

    // 1. Kiểm tra tham số 'url' trong chính request hiện tại
    const requestUrlParam = request.nextUrl.searchParams.get('url');
    if (requestUrlParam) {
      try {
        const parsedUrl = new URL(requestUrlParam);
        if (isAllowedHost(parsedUrl.hostname)) {
          targetOrigin = parsedUrl.origin;
          isProxyRequest = true;
        }
      } catch (_) {}
    }

    // 2. Kiểm tra header Referer để xác định xem có phải từ iframe proxy không
    if (!isProxyRequest && referer) {
      try {
        const refererUrl = new URL(referer);
        const refererUrlParam = refererUrl.searchParams.get('url');
        if (refererUrlParam) {
          const parsedRefererUrl = new URL(refererUrlParam);
          if (isAllowedHost(parsedRefererUrl.hostname)) {
            targetOrigin = parsedRefererUrl.origin;
            isProxyRequest = true;
          }
        } else {
          // Nếu referrer pathname không thuộc về AntBiz, đây là yêu cầu phát sinh từ iframe (ví dụ điều hướng Next.js mềm)
          if (!isActualAntBizRoute(refererUrl.pathname)) {
            const cookieOrigin = request.cookies.get('active_proxy_origin')?.value;
            if (cookieOrigin) {
              try {
                const parsedCookie = new URL(cookieOrigin);
                if (isAllowedHost(parsedCookie.hostname)) {
                  targetOrigin = parsedCookie.origin;
                  isProxyRequest = true;
                }
              } catch (_) {}
            }
          }
        }
      } catch (_) {}
    }

    // Nếu xác định đây là yêu cầu thuộc iframe proxy và có targetOrigin hợp lệ
    if (isProxyRequest && targetOrigin) {
      const dest = request.nextUrl.clone();
      dest.pathname = '/api/proxy';
      
      // Loại bỏ tham số 'url' của AntBiz khỏi query string trước khi gửi đến đích
      const searchParams = new URLSearchParams(request.nextUrl.search);
      searchParams.delete('url');
      const cleanSearch = searchParams.toString();
      const searchSuffix = cleanSearch ? `?${cleanSearch}` : '';

      const absoluteTargetUrl = new URL(pathname + searchSuffix, targetOrigin).href;
      dest.search = `?url=${encodeURIComponent(absoluteTargetUrl)}`;
      
      const rewriteResponse = NextResponse.rewrite(dest);
      rewriteResponse.cookies.set('active_proxy_origin', targetOrigin, {
        path: '/',
        maxAge: 3600,
        sameSite: 'lax',
      });
      return rewriteResponse;
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

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

  // Kiểm tra Session (Xác thực JWT Token từ Cookie qua Supabase server)
  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  const isDev = process.env.NODE_ENV === 'development';
  const isBypass = isDev && request.headers.get('x-bypass-auth') === 'true';
  const isPublicRoute = 
    isBypass ||
    url.pathname === '/' ||
    url.pathname === '/login' || 
    url.pathname === '/register' || 
    url.pathname === '/forgot-password' || 
    url.pathname === '/reset-password' || 
    url.pathname.startsWith('/api/auth');

  // Lấy và kiểm tra thông tin user profile trong database
  let profileExists = false;
  let isLocked = false;

  if (user) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('status')
      .eq('id', user.id)
      .maybeSingle();

    if (userProfile) {
      profileExists = true;
      if (userProfile.status === 'locked') {
        isLocked = true;
      }
    }
  }

  // Nếu người dùng có session nhưng không có profile trong public.users (tài khoản cũ trước khi chạy schema) hoặc bị khóa
  if (user && (!profileExists || isLocked)) {
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
  if (user && profileExists && !isLocked && (url.pathname === '/login' || url.pathname === '/register')) {
    const nextParam = url.searchParams.get('next')
    if (nextParam) {
      return NextResponse.redirect(new URL(nextParam, request.url))
    }
    url.pathname = '/overview'
    return NextResponse.redirect(url)
  }

  // 2. Nếu người dùng CHƯA ĐĂNG NHẬP hoặc không có profile hợp lệ mà cố tình truy cập các trang được bảo vệ (tất cả trừ public)
  if (!user && !isPublicRoute) {
    // Với API, trả về JSON 401 thay vì redirect
    if (url.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Bạn cần đăng nhập để thực hiện hành động này' },
        { status: 401 }
      );
    }
    url.pathname = '/'
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
    '/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
