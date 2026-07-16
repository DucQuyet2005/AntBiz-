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
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      return new NextResponse(`Failed to fetch: ${res.statusText}`, { status: res.status });
    }

    let html = await res.text();
    const targetOrigin = new URL(targetUrl).origin;

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

    // ── 4. Strip only the internal Next.js inline hydration/data scripts ──────
    // Keep external or CDN-served /_next/ JS bundles so the target site can hydrate.
    html = html.replace(/<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<script\b[^>]*>([\s\S]*?\bself\.__next[\s\S]*?)<\/script>/gi, '');
    html = html.replace(/<script\b[^>]*\bdata-next-page[^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<script\b[^>]*\b__NEXT_LOADED_PAGES__\b[^>]*>[\s\S]*?<\/script>/gi, '');

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

  /* ── Report current page URL to parent AntBiz window ── */
  function report() {
    try { window.parent.postMessage({ type: 'URL_CHANGE', url: TARGET }, '*'); } catch (_) {}
  }
  report();
  setInterval(report, 800);

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

  /* ── Override history.pushState / replaceState ── */
  var _origPush = history.pushState.bind(history);
  history.pushState = function (state, title, url) {
    if (url) {
      try {
        var abs = getAbsoluteUrl(String(url));
        if (isAllowedHost(abs)) {
          navigateViaProxy(abs);
          return;
        }
      } catch (_) {}
    }
    return _origPush(state, title, url);
  };

  var _origReplace = history.replaceState.bind(history);
  history.replaceState = function (state, title, url) {
    if (url) {
      try {
        var abs = getAbsoluteUrl(String(url));
        if (isAllowedHost(abs)) {
          navigateViaProxy(abs);
          return;
        }
      } catch (_) {}
    }
    return _origReplace(state, title, url);
  };

  /* ── Override window.fetch ── */
  var _origFetch = window.fetch.bind(window);
  window.fetch = function(input, init) {
    try {
      var urlStr = (typeof input === 'string') ? input
                 : (input instanceof Request ? input.url : String(input));
      var abs = getAbsoluteUrl(urlStr);

      if (isAllowedHost(abs)) {
        var parsedUrl = new URL(abs);
        var pathname = parsedUrl.pathname;

        /* Allow Next.js static chunk files to load directly */
        if (pathname.startsWith('/_next/static/')) {
          return _origFetch(input, init);
        }

        /* Detect RSC / data navigation requests */
        var isRscRequest = false;
        try {
          var headers = (init && init.headers) ? init.headers
                      : (input instanceof Request ? input.headers : null);
          if (headers) {
            var get = function(name) {
              try {
                if (headers instanceof Headers) return !!headers.get(name);
                if (typeof headers === 'object') return !!(headers[name] || headers[name.toLowerCase()]);
              } catch(_) {}
              return false;
            };
            isRscRequest = get('Next-Router-State-Tree') || get('RSC') || get('Next-Url');
          }
        } catch(_) {}

        if (!isRscRequest) {
          isRscRequest = parsedUrl.searchParams.has('_rsc') || pathname.startsWith('/_next/data/');
        }

        if (isRscRequest) {
          navigateViaProxy(TARGET_ORIGIN + pathname + parsedUrl.search);
          return new Promise(function() {});
        }
      }
    } catch(_) {}
    return _origFetch(input, init);
  };

  /* ── Override XMLHttpRequest (belt-and-suspenders for RSC/data requests) ── */
  var _origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    try {
      var abs = getAbsoluteUrl(String(url));
      if (isAllowedHost(abs)) {
        var parsedXhr = new URL(abs);
        var xhrPath = parsedXhr.pathname;
        /* Only intercept Next.js RSC data fetch paths, not all XHR */
        var isXhrRsc = parsedXhr.searchParams.has('_rsc') || xhrPath.startsWith('/_next/data/');
        if (isXhrRsc) {
          navigateViaProxy(TARGET_ORIGIN + xhrPath + parsedXhr.search);
          return;
        }
      }
    } catch(_) {}
    return _origOpen.apply(this, arguments);
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

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    return new NextResponse(`Error proxying page: ${error.message}`, { status: 500 });
  }
}
