import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';

// Danh sách domain được phép truy cập qua proxy
const ALLOWED_HOSTNAMES = [
  'gocnhinmoi.com.vn',
  'gocnhinmoi.com',
  'cdn.gocnhinmoi.com',
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
  // Proxy GET request is restricted by ALLOWED_HOSTNAMES, so authentication is not strictly required here.
  // This allows <img> tags to fetch images reliably without cookie/auth issues.
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
    const parsedTarget = new URL(targetUrl);
    
    let spoofReferer = parsedTarget.origin + '/';
    if (spoofReferer.includes('dantri.com.vn')) {
      spoofReferer = 'https://dantri.com.vn/';
    } else if (spoofReferer.includes('tuoitre.vn')) {
      spoofReferer = 'https://tuoitre.vn/';
    } else if (spoofReferer.includes('gocnhinmoi.com.vn') || spoofReferer.includes('gocnhinmoi.com')) {
      spoofReferer = 'https://gocnhinmoi.com.vn/';
    }
    
    reqHeaders.set('Referer', spoofReferer);
    reqHeaders.set('User-Agent', request.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    reqHeaders.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8');
    reqHeaders.set('Accept-Language', 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7');
    reqHeaders.set('Sec-Fetch-Dest', 'document');
    reqHeaders.set('Sec-Fetch-Mode', 'navigate');
    reqHeaders.set('Sec-Fetch-Site', 'none');
    reqHeaders.set('Sec-Fetch-User', '?1');
    reqHeaders.set('Upgrade-Insecure-Requests', '1');
    
    const headersToForward = [
      'content-type',
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

    console.log(`[Proxy] Fetched ${targetUrl} -> Status: ${res.status}`);

    const targetOrigin = new URL(targetUrl).origin;
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

  // ── Fix SPA Routers (Dantri) ──
  // SPA routers read window.location.pathname to determine the page to render.
  // We cannot spoof window.location via Object.defineProperty because it's non-configurable.
  // Instead, we use the History API to actually change the browser's URL path to match the target.
  try {
    var _parsedTarget = new URL(TARGET);
    var _targetPath = _parsedTarget.pathname + _parsedTarget.search + _parsedTarget.hash;
    if (window.location.pathname !== _parsedTarget.pathname) {
      // Must use window.location.origin to bypass the <base> tag resolution, otherwise SecurityError
      window.history.replaceState(null, '', window.location.origin + _targetPath);
    }
  } catch(_e) {
    console.error('[Proxy] Failed to rewrite history state:', _e);
  }

  function isAllowedHost(url) {
    try {
      var h = new URL(url).hostname;
      return ALLOWED_HOSTNAMES.some(function(a) { return h === a || h.endsWith('.' + a); });
    } catch(_) { return false; }
  }

  var _currentTarget = TARGET;
  function report() {
    try { window.parent.postMessage({ type: 'URL_CHANGE', url: _currentTarget }, '*'); } catch (_) {}
  }
  report();

  // Block window.open (ads use this for popup redirects)
  window.open = function() { return null; };

  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'NAVIGATE_BACK') {
      try { history.back(); } catch (_) {}
    }
  });

  function getAbsoluteUrl(urlStr) {
    try {
      var s = String(urlStr);
      var idx = s.indexOf('/api/proxy?url=');
      if (idx !== -1) {
        var params = new URLSearchParams(s.substring(idx).split('?')[1]);
        var original = params.get('url');
        if (original) return original;
      }
      return new URL(s, _currentTarget || TARGET).href;
    } catch(_) { return urlStr; }
  }

  var _origPush = history.pushState.bind(history);
  history.pushState = function (state, title, url) {
    if (url) {
      try {
        var abs = getAbsoluteUrl(String(url));
        if (isAllowedHost(abs)) { _currentTarget = abs; report(); }
      } catch (_) {}
    }
    return _origPush(state, title, url);
  };

  var _origReplace = history.replaceState.bind(history);
  history.replaceState = function (state, title, url) {
    if (url) {
      try {
        var abs = getAbsoluteUrl(String(url));
        if (isAllowedHost(abs)) { _currentTarget = abs; report(); }
      } catch (_) {}
    }
    return _origReplace(state, title, url);
  };

  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el.tagName !== 'A') el = el.parentElement;
    if (!el) return;
    var href = el.getAttribute('href');
    if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0 || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    try {
      if (href.indexOf('/api/proxy?') !== -1) {
        window.location.href = new URL(href, window.location.origin).href;
        return;
      }
      var abs = new URL(href, _currentTarget || TARGET).href;
      if (!isAllowedHost(abs)) return; // Block navigation to non-allowed hosts (ads, trackers)
      window.location.href = PROXY + encodeURIComponent(abs);
    } catch (err) {}
  }, true);

  // Remove ad iframes/scripts injected dynamically by ad networks
  if (typeof MutationObserver !== 'undefined') {
    var adPatterns = /doubleclick|googlesyndication|googleadservices|adnxs|facebook\\.net\\/signals|ads\\.|tracker|analytics/i;
    new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        m.addedNodes.forEach(function(node) {
          if (node.nodeType !== 1) return;
          var tag = node.tagName;
          if (tag === 'IFRAME' || tag === 'SCRIPT') {
            var src = node.getAttribute('src') || '';
            if (adPatterns.test(src)) {
              node.remove();
            }
          }
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
</script>`;

    if (!res.ok) {
      // Return a basic HTML page with the script injected so the back button still works
      const errorHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">${interceptorScript}</head><body style="font-family:sans-serif;padding:20px;text-align:center;"><h2>Proxy Fetch Error</h2><p>Failed to fetch: ${res.statusText} (${res.status})</p></body></html>`;
      return new NextResponse(errorHtml, { 
        status: res.status,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    const contentType = res.headers.get('content-type') || '';
    const isHtml = contentType.toLowerCase().includes('text/html');

    if (!isHtml) {
      const buffer = await res.arrayBuffer();
      const response = new NextResponse(buffer, {
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

    // ── 1. Rewrite relative src to appropriate destination ───────────────
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.avif'];
    const needsImageProxy = parsedTarget.hostname.includes('dantri.com.vn');
    
    html = html.replace(/(\bsrc\s*=\s*)(['"])\/([^'"]*)\2/g, (_m, attr, q, path) => {
      const lowerPath = path.split('?')[0].toLowerCase();
      const isImage = imageExts.some(ext => lowerPath.endsWith(ext));
      if (isImage && needsImageProxy) {
        // Only Dantri images go through proxy to bypass hotlink protection
        return `${attr}${q}/api/proxy?url=${encodeURIComponent(targetOrigin + '/' + path)}${q}`;
      }
      // Everything else goes direct to origin
      return `${attr}${q}${targetOrigin}/${path}${q}`;
    });
    
    html = html.replace(/(\bsrcset\s*=\s*)(['"])([^'"]+)\2/g, (_m, attr, q, srcset) => {
      const rewritten = srcset.replace(
        /(^|,\s*)(\/[^\s,]+)/g,
        (_s: string, sep: string, p: string) => {
          if (needsImageProxy) {
            return `${sep}/api/proxy?url=${encodeURIComponent(targetOrigin + p)}`;
          }
          return `${sep}${targetOrigin}${p}`;
        },
      );
      return `${attr}${q}${rewritten}${q}`;
    });

    // 1.5 Rewrite absolute src / data-src / data-original for images to proxy (Dantri hotlink protection)
    if (needsImageProxy) {
      html = html.replace(/(\b(?:src|data-src|data-original)\s*=\s*)(['"])(https?:\/\/[^'"]+)\2/gi, (_m, attr, q, urlStr) => {
        if (urlStr.includes('/api/proxy?')) return _m; // Already proxied
        try {
          const parsed = new URL(urlStr);
          const isSameAllowedDomain = ALLOWED_HOSTNAMES.some(
            (h) => parsed.hostname === h || parsed.hostname.endsWith('.' + h)
          );
          if (isSameAllowedDomain) {
            const lowerPath = parsed.pathname.split('?')[0].toLowerCase();
            const isImage = imageExts.some(ext => lowerPath.endsWith(ext));
            if (isImage) {
              return `${attr}${q}/api/proxy?url=${encodeURIComponent(urlStr)}${q}`;
            }
          }
        } catch (_) {}
        return _m;
      });
    }

    // 1.6 Rewrite relative data-src / data-original (lazy-loaded images, used by Dantri)
    if (needsImageProxy) {
      html = html.replace(/(\b(?:data-src|data-original)\s*=\s*)(['"])\/([^'"]*)\2/gi, (_m, attr, q, path) => {
        return `${attr}${q}/api/proxy?url=${encodeURIComponent(targetOrigin + '/' + path)}${q}`;
      });
    }

    // ── 2. Rewrite all href attributes ───────────────────────────────────────
    const staticExts = [
      '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.webp',
      '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.map',
    ];

    html = html.replace(/(\bhref\s*=\s*)(['"])([^'"]+)\2/g, (_m, attr, q, href) => {
      if (href.includes('/api/proxy?')) return `${attr}${q}${href}${q}`;
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

      const isStatic = staticExts.some((ext) => absolute.split('?')[0].endsWith(ext));
      if (isStatic) return `${attr}${q}${absolute}${q}`;

      const parsed = new URL(absolute);
      const isSameAllowedDomain = ALLOWED_HOSTNAMES.some(
        (h) => parsed.hostname === h || parsed.hostname.endsWith('.' + h)
      );
      if (isSameAllowedDomain) {
        return `${attr}${q}/api/proxy?url=${encodeURIComponent(absolute)}${q}`;
      }

      return `${attr}${q}${absolute}${q}`;
    });

    // ── 3. Remove framing restrictions ───────────────────────────────
    html = html.replace(/<meta[^>]+http-equiv=["']X-Frame-Options["'][^>]*>/gi, '');
    html = html.replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');

    // Removed script stripping:
    // Stripping scripts breaks Next.js App Router streaming (Gocnhinmoi) which relies on inline scripts to swap templates.
    // It also breaks Dantri's lazy loading for images. 
    // The history API spoofing injected below is sufficient to prevent SPA router 404 errors.

    // ── 4. Inject navigation interceptor into <head> BEFORE any JS ───────────

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
