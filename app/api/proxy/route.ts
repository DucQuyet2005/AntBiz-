import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';

// Danh sách domain được phép truy cập qua proxy
const ALLOWED_HOSTNAMES = [
  'gocnhinmoi.com.vn',
  'tuoitre.vn',
  'dantri.com.vn',
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Chặn bypass SSRF qua thông tin đăng nhập trong URL
    if (parsed.username || parsed.password) {
      return false;
    }
    return ALLOWED_HOSTNAMES.some(
      (hostname) =>
        parsed.hostname === hostname ||
        parsed.hostname.endsWith('.' + hostname)
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { unauthorized } = await requireUserWithRole([
    'admin',
    'marketer_full',
    'marketer_content',
  ]);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  if (!isAllowedUrl(targetUrl)) {
    return new NextResponse('URL not allowed', { status: 403 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const reqHeaders = new Headers();
    reqHeaders.set('User-Agent', request.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    reqHeaders.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
    reqHeaders.set('Accept-Language', 'vi-VN,vi;q=0.9,en-US;q=0.8');
    
    const headersToForward = [
      'cache-control',
      'content-type',
      'rsc',
      'next-router-state-tree',
      'next-router-prefetch',
      'next-url'
    ];
    for (const h of headersToForward) {
      const val = request.headers.get(h);
      if (val) {
        reqHeaders.set(h, val);
      }
    }

    const res = await fetch(targetUrl, {
      headers: reqHeaders,
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return new NextResponse(`Failed to fetch: ${res.statusText}`, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || '';
    const isHtml = contentType.toLowerCase().includes('text/html');
    const targetOrigin = new URL(targetUrl).origin;

    if (!isHtml) {
      const rawData = await res.arrayBuffer();
      const response = new NextResponse(rawData, {
        status: res.status,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': res.headers.get('cache-control') || 'no-store',
        },
      });
      response.cookies.set('active_proxy_origin', targetOrigin, {
        path: '/',
        maxAge: 3600,
        sameSite: 'lax',
      });
      return response;
    }

    let html = await res.text();

    // ── 1. Rewrite relative src / srcset to absolute CDN paths ───────────────
    // Match src="/..." attributes and make them absolute
    html = html.replace(/(\bsrc\s*=\s*)(['"])\/([^'"]*)\2/g, (_m, attr, q, path) => {
      return `${attr}${q}${targetOrigin}/${path}${q}`;
    });
    html = html.replace(/(\bsrcset\s*=\s*)(['"])([^'"]+)\2/g, (_m, attr, q, srcset) => {
      const rewritten = srcset.replace(
        /(^|,\s*)(\/[^\s,]+)/g,
        (_s: string, sep: string, p: string) => `${sep}${targetOrigin}${p}`,
      );
      return `${attr}${q}${rewritten}${q}`;
    });

    // ── 2. Rewrite all href attributes ───────────────────────────────────────
    const staticExts = [
      '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.webp',
      '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.map',
    ];

    html = html.replace(/(\bhref\s*=\s*)(['"])([^'"]+)\2/g, (_m, attr, q, href) => {
      // Already proxied — leave alone
      if (href.includes('/api/proxy?')) return `${attr}${q}${href}${q}`;

      // Special schemes — leave alone
      if (
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:')
      ) {
        return `${attr}${q}${href}${q}`;
      }

      let absolute: string;
      try {
        absolute = new URL(href, targetUrl).href;
      } catch {
        return `${attr}${q}${href}${q}`;
      }

      // Static assets → keep absolute (CSS, images, fonts load directly from CDN)
      const isStatic = staticExts.some((ext) => absolute.split('?')[0].endsWith(ext));
      if (isStatic) return `${attr}${q}${absolute}${q}`;

      // Only proxy allowed domain page URLs
      const parsed = new URL(absolute);
      const isSameAllowedDomain = ALLOWED_HOSTNAMES.some(
        (h) => parsed.hostname === h || parsed.hostname.endsWith('.' + h)
      );
      if (isSameAllowedDomain) {
        return `${attr}${q}/api/proxy?url=${encodeURIComponent(absolute)}${q}`;
      }

      // External link → leave as absolute
      return `${attr}${q}${absolute}${q}`;
    });

    // ── 3. Remove framing restrictions ───────────────────────────────────────
    html = html.replace(/<meta[^>]+http-equiv=["']X-Frame-Options["'][^>]*>/gi, '');
    html = html.replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');

    // ── 4. Inject navigation interceptor into <head> BEFORE any JS ───────────
    const forwardedHost = request.headers ? request.headers.get('x-forwarded-host') : null;
    const forwardedProto = (request.headers ? request.headers.get('x-forwarded-proto') : null) || 'http';
    const host = request.headers ? request.headers.get('host') : null;
    const externalHost = forwardedHost || host;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (externalHost ? `${forwardedProto}://${externalHost}` : request.nextUrl.origin);
    const parentOrigin = new URL(siteUrl).origin;

    const interceptorScript = `<style>
  /* ── Ad/banner slots that cause whitespace (tuoitre, dantri, gocnhinmoi) ── */
  #LeaderBoardTop, .leaderboard, [id*="LeaderBoard"], [class*="leaderboard"],
  #divAdRight, #divAdLeft, .banner-top, #banner-top,
  .ad-container, .adv-container,
  /* Dân trí specific */
  .dt-ads, .dt-ads-holder, .dt-ads-middle, .dt-ads-right,
  [id*="cate_top_ads"], [id*="article_top_ads"], [id*="ads_"],
  .box-ads, .box-banner, .banner-ads, .ads-banner,
  [class*="ads-top"], [class*="top-ads"], [class*="dfp-"],
  #bannerMasthead, .ads-masthead, #desktop-home-top-page, .top-page,
  /* Tuổi Trẻ specific */
  .box-adv, #ads300x250_sticky, #ads300x600,
  /* Generic */
  [data-testid*="ad"], [aria-label*="advertisement"] {
    display: none !important;
    height: 0 !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
</style>
<script>
(function () {
  var PROXY = '/api/proxy?url=';
  var TARGET = ${JSON.stringify(targetUrl)};
  var TARGET_ORIGIN = ${JSON.stringify(targetOrigin)};
  var PARENT_ORIGIN = ${JSON.stringify(parentOrigin)};
  var ALLOWED_HOSTNAMES = ${JSON.stringify(ALLOWED_HOSTNAMES)};

  function isAllowedHost(url) {
    try {
      var h = new URL(url).hostname;
      return ALLOWED_HOSTNAMES.some(function(a) { return h === a || h.endsWith('.' + a); });
    } catch(_) { return false; }
  }

  /* ── Track the "real" URL (updated when Next.js does soft navigation) ── */
  var _currentTarget = TARGET;

  /* ── Report current page URL to parent AntBiz window ── */
  function report() {
    try { window.parent.postMessage({ type: 'URL_CHANGE', url: _currentTarget }, PARENT_ORIGIN); } catch (_) {}
  }
  report();

  function getAbsoluteUrl(urlStr) {
    try {
      var s = String(urlStr);
      /* Already a proxied URL — unwrap it */
      var idx = s.indexOf('/api/proxy?url=');
      if (idx !== -1) {
        var params = new URLSearchParams(s.substring(idx).split('?')[1]);
        var original = params.get('url');
        if (original) return original;
      }
      /* Resolve relative to the TARGET ORIGIN (not the specific article URL) */
      return new URL(s, TARGET_ORIGIN).href;
    } catch(_) { return urlStr; }
  }

  /* ── Utility: navigate iframe to proxied URL ── */
  function navigateViaProxy(absUrl) {
    try {
      window.location.replace(PROXY + encodeURIComponent(absUrl));
    } catch(_) {}
  }

  /* ── Override history.pushState / replaceState ──────────────────────────────
   * Strategy: track _currentTarget for address-bar reporting but do NOT call
   * navigateViaProxy() (that caused infinite full-page reload loops).
   * We DO let _origPush/_origReplace run so Next.js App Router registers that
   * the URL changed and stops retrying navigation (blocking pushState caused
   * ~500ms polling loops). Leaked RSC requests from the new URL are handled by
   * proxy.ts middleware (204 for non-AntBiz RSC), and leaked ?url= navigations
   * are caught by the recovery redirect in proxy.ts.
   * ─────────────────────────────────────────────────────────────────────────── */
  var _origPush = history.pushState.bind(history);
  history.pushState = function (state, title, url) {
    if (url) {
      try {
        var abs = getAbsoluteUrl(String(url));
        if (isAllowedHost(abs)) {
          _currentTarget = abs;
          report();
        }
      } catch (_) {}
    }
    return _origPush(state, title, url); /* allow URL to change so Next.js doesn't retry */
  };

  var _origReplace = history.replaceState.bind(history);
  history.replaceState = function (state, title, url) {
    if (url) {
      try {
        var abs = getAbsoluteUrl(String(url));
        if (isAllowedHost(abs)) {
          _currentTarget = abs;
          report();
        }
      } catch (_) {}
    }
    return _origReplace(state, title, url); /* allow URL to change so Next.js doesn't retry */
  };

  /* ── Capture-phase click interceptor ── */
  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el.tagName !== 'A') el = el.parentElement;
    if (!el) return;
    var href = el.getAttribute('href');
    if (!href) return;
    if (href.charAt(0) === '#' || href.indexOf('javascript:') === 0 || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    try {
      if (href.indexOf('/api/proxy?') !== -1) {
        window.location.href = new URL(href, window.location.origin).href;
        return;
      }
      var abs = new URL(href, TARGET_ORIGIN).href;
      if (!isAllowedHost(abs)) return;
      window.location.href = PROXY + encodeURIComponent(abs);
    } catch (err) { console.error(err); }
  }, true);
})();
</script>`;

    const baseTag = `<base href="${targetOrigin}/">`;
    const fullHeaderInjection = baseTag + interceptorScript;

    // Insert into <head> — before any other scripts
    if (/<head[\s>]/i.test(html)) {
      html = html.replace(/(<head[\s>][^>]*>|<head>)/i, (m: string) => m + fullHeaderInjection);
    } else {
      html = fullHeaderInjection + html;
    }

    const response = new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
    response.cookies.set('active_proxy_origin', targetOrigin, {
      path: '/',
      maxAge: 3600,
      sameSite: 'lax',
    });
    return response;
  } catch (error: any) {
    console.error(`[Proxy Error] Failed to proxy URL ${targetUrl}:`, error);
    return new NextResponse(`Error proxying page: ${error.message}`, { status: 500 });
  }
}
