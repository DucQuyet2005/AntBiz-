import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';

// Danh sách domain được phép truy cập qua proxy
const ALLOWED_HOSTNAMES = [
  'gocnhinmoi.com.vn',
  'gocnhinmoi.com',
  'cdn.gocnhinmoi.com',
  'tuoitre.vn',
  'tuoitrecdn.net',
  'dantri.com.vn',
  'vcmedia.vn',
  'dantricdn.com',
  'vccorp.vn',
  'mediacdn.vn',
  'dtadnetwork.com',
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

function normalizeProxyOrigin(origin: string): string {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    if (host.includes('dantri') || host.includes('vcmedia') || host.includes('vccorp')) {
      return 'https://dantri.com.vn';
    }
    if (host.includes('tuoitre')) {
      return 'https://tuoitre.vn';
    }
    if (host.includes('gocnhinmoi')) {
      return 'https://gocnhinmoi.com.vn';
    }
  } catch (_) {}
  return origin;
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
    if (spoofReferer.includes('dantri.com.vn') || spoofReferer.includes('vcmedia.vn') || spoofReferer.includes('dantricdn.com') || spoofReferer.includes('vccorp.vn')) {
      spoofReferer = 'https://dantri.com.vn/';
    } else if (spoofReferer.includes('tuoitre.vn') || spoofReferer.includes('tuoitrecdn.net')) {
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



  function isAllowedHost(url) {
    try {
      var h = new URL(url).hostname;
      return ALLOWED_HOSTNAMES.some(function(a) { return h === a || h.endsWith('.' + a); });
    } catch(_) { return false; }
  }

  var _currentTarget = TARGET;
  function report() {
    try {
      if (!_currentTarget) return;
      var path = new URL(_currentTarget).pathname.toLowerCase();
      if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.json') || path.endsWith('.ico') || path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.includes('sw.js')) {
        return;
      }
      window.parent.postMessage({ type: 'URL_CHANGE', url: _currentTarget }, '*');
    } catch (_) {}
  }
  report();

  // Disable ServiceWorker registration inside proxy iframe to prevent /sw.js 404 navigation errors
  if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
    navigator.serviceWorker.register = function() {
      return Promise.reject(new Error('ServiceWorker disabled in proxy'));
    };
  }

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

    // Force target to _self so links stay inside iframe
    if (el.getAttribute('target') === '_blank') {
      el.setAttribute('target', '_self');
    }

    var href = el.getAttribute('href');
    if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0 || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;

    try {
      var abs = new URL(href, _currentTarget || TARGET).href;
      if (!isAllowedHost(abs)) {
        // Block navigation to external ad domains
        e.preventDefault();
        return;
      }
      _currentTarget = abs;
      report();
    } catch (err) {}
  }, false);

  // ── Intercept fetch() so Dantri lazy-loaders & APIs go through proxy ──
  var _fetch = window.fetch;
  window.fetch = function(input, init) {
    try {
      var urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : null);
      if (urlStr && typeof urlStr === 'string') {
        var proxiedUrl = null;
        if (urlStr.startsWith('/') && !urlStr.startsWith('//') && !urlStr.startsWith('/api/proxy')) {
          proxiedUrl = PROXY + encodeURIComponent(TARGET_ORIGIN + urlStr);
        } else if (urlStr.startsWith('http') && urlStr.indexOf('/api/proxy') === -1) {
          if (isAllowedHost(urlStr)) proxiedUrl = PROXY + encodeURIComponent(urlStr);
        }

        if (proxiedUrl) {
          if (typeof input === 'string') {
            input = proxiedUrl;
          } else if (input && typeof input === 'object') {
            input = new Request(proxiedUrl, input);
          }
        }
      }
    } catch (_) {}
    return _fetch.call(window, input, init);
  };

  // ── Intercept XMLHttpRequest.open ──
  var _xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string') {
      if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/api/proxy')) {
        url = PROXY + encodeURIComponent(TARGET_ORIGIN + url);
      } else if (url.startsWith('http') && url.indexOf('/api/proxy') === -1) {
        if (isAllowedHost(url)) url = PROXY + encodeURIComponent(url);
      }
    }
    var args = Array.prototype.slice.call(arguments);
    args[1] = url;
    return _xhrOpen.apply(this, args);
  };

  // ── Lazy-image src promotion (client-side, safe – no infinite loop) ──
  if (typeof MutationObserver !== 'undefined') {
    var _imgProcessed = '_proxyDone';
    function proxyImg(el) {
      if (el[_imgProcessed]) return;
      var real = el.getAttribute('data-src') || el.getAttribute('data-original') || el.getAttribute('src');
      if (real && !real.startsWith('data:') && !real.startsWith('blob:') && real.indexOf('/api/proxy') === -1) {
        try {
          var abs = new URL(real, _currentTarget || TARGET).href;
          if (isAllowedHost(abs)) {
            el[_imgProcessed] = true;
            el.setAttribute('src', PROXY + encodeURIComponent(abs));
          }
        } catch(_) {}
      }
    }
    new MutationObserver(function(muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) {
            var n = m.addedNodes[j];
            if (n.nodeType !== 1) continue;
            if (n.tagName === 'IMG') proxyImg(n);
            var imgs = n.querySelectorAll ? n.querySelectorAll('img') : [];
            for (var k = 0; k < imgs.length; k++) proxyImg(imgs[k]);
          }
        } else if (m.type === 'attributes' && m.target.tagName === 'IMG') {
          if (m.attributeName === 'src' || m.attributeName === 'data-src' || m.attributeName === 'data-original') {
            proxyImg(m.target);
          }
        }
      }
    }).observe(document.documentElement, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['src', 'data-src', 'data-original']
    });
    // Process existing images once DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
      var imgs = document.querySelectorAll('img');
      for (var i = 0; i < imgs.length; i++) proxyImg(imgs[i]);
    });
  }

  // Lightweight periodic cleanup of ad iframes without layout thrashing
  setInterval(function() {
    try {
      var iframes = document.querySelectorAll('iframe[src*="doubleclick"], iframe[src*="googlesyndication"], iframe[src*="adnxs"]');
      for (var i = 0; i < iframes.length; i++) {
        iframes[i].remove();
      }
    } catch (_) {}
  }, 3000);
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
      if (contentType.toLowerCase().includes('json')) {
        let jsonText = await res.text();
        jsonText = jsonText.replace(/https:\/\/(cdnphoto|icdn|cdnweb)\.dantri\.com\.vn\/[^\s"',\\]+/gi, (imgUrl) => {
          return `/api/proxy?url=${encodeURIComponent(imgUrl)}`;
        });
        const response = new NextResponse(jsonText, {
          status: res.status,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': res.headers.get('cache-control') || 'no-store',
          },
        });
        response.cookies.set('active_proxy_origin', normalizeProxyOrigin(targetOrigin), {
          path: '/api/proxy',
          maxAge: 3600,
          sameSite: 'lax',
        });
        return response;
      }

      const buffer = await res.arrayBuffer();
      const response = new NextResponse(buffer, {
        status: res.status,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': res.headers.get('cache-control') || 'no-store',
        },
      });
      response.cookies.set('active_proxy_origin', normalizeProxyOrigin(targetOrigin), {
        path: '/api/proxy',
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
    

    const isTargetDomain = (host: string) => {
      return ['dantri.com.vn', 'vcmedia.vn', 'dantricdn.com', 'tuoitre.vn', 'tuoitrecdn.net', 'gocnhinmoi.com', 'vccorp.vn', 'mediacdn.vn', 'dtadnetwork.com'].some(h => host.includes(h));
    };

    // 1.5 Rewrite ALL images (src, data-src, data-original) to use proxy for Dantri & others
    if (needsImageProxy) {
      // Promote data-src / data-original to src so lazy images render immediately without gray boxes
      html = html.replace(/<img\s+[^>]*>/gi, (imgTag) => {
        const dataSrcMatch = imgTag.match(/\b(?:data-src|data-original)\s*=\s*(['"])([^'"]+)\1/i);
        if (dataSrcMatch && dataSrcMatch[2]) {
          const realUrl = dataSrcMatch[2];
          if (!realUrl.startsWith('data:') && !realUrl.startsWith('blob:')) {
            try {
              const absolute = new URL(realUrl, targetUrl).href;
              const proxied = `/api/proxy?url=${encodeURIComponent(absolute)}`;
              if (/\bsrc\s*=\s*(['"])[^'"]*\1/i.test(imgTag)) {
                return imgTag.replace(/\bsrc\s*=\s*(['"])[^'"]*\1/i, `src="${proxied}"`);
              } else {
                return imgTag.replace('<img', `<img src="${proxied}"`);
              }
            } catch (_) {}
          }
        }
        return imgTag;
      });

      html = html.replace(/(\b(?:src|data-src|data-original)\s*=\s*)(['"])([^'"]+)\2/gi, (_m, attr, q, urlStr) => {
        if (urlStr.startsWith('data:') || urlStr.startsWith('blob:') || urlStr.startsWith('#')) return _m;
        if (urlStr.includes('/api/proxy?')) return _m;

        const lowerUrl = urlStr.split('?')[0].toLowerCase();
        const isImage = imageExts.some(ext => lowerUrl.endsWith(ext)) || urlStr.includes('icdn.dantri.com.vn') || urlStr.includes('cdnweb.dantri.com.vn');
        if (!isImage) return _m;

        try {
          const absolute = new URL(urlStr, targetUrl).href;
          const u = new URL(absolute);
          if (isTargetDomain(u.hostname)) {
            return `${attr}${q}/api/proxy?url=${encodeURIComponent(absolute)}${q}`;
          }
          return `${attr}${q}${absolute}${q}`;
        } catch(e) {}
        return _m;
      });

      // Rewrite srcset and data-srcset cleanly preserving descriptors like 1x, 2x, 480w
      html = html.replace(/(\b(?:srcset|data-srcset)\s*=\s*)(['"])([^'"]+)\2/gi, (_m, attr, q, srcset) => {
        const rewritten = srcset.split(',').map((entry: string) => {
          const trimmed = entry.trim();
          if (!trimmed) return entry;
          const parts = trimmed.split(/\s+/);
          const urlStr = parts[0];
          const descriptor = parts.slice(1).join(' ');

          if (urlStr.startsWith('data:') || urlStr.startsWith('blob:') || urlStr.includes('/api/proxy?')) {
            return entry;
          }
          try {
            const absolute = new URL(urlStr, targetUrl).href;
            const u = new URL(absolute);
            if (isTargetDomain(u.hostname)) {
              const proxied = `/api/proxy?url=${encodeURIComponent(absolute)}`;
              return descriptor ? `${proxied} ${descriptor}` : proxied;
            }
            return descriptor ? `${absolute} ${descriptor}` : absolute;
          } catch(e) {
            return entry;
          }
        }).join(', ');
        return `${attr}${q}${rewritten}${q}`;
      });
    }

    // ── 2. Remove framing restrictions ───────────────────────────────
    html = html.replace(/<meta[^>]+http-equiv=["']X-Frame-Options["'][^>]*>/gi, '');
    html = html.replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');

    const fullHeaderInjection = interceptorScript;

    // Only inject interceptors into full HTML pages, NOT fragments (e.g. AJAX responses)
    // Injecting into fragments causes the script to run when the fragment is inserted into the DOM,
    // which triggers false URL_CHANGE events and breaks the iframe.
    const hasHead = /<head[\s>]/i.test(html);
    const hasHtml = /<html[\s>]/i.test(html);
    const hasDoctype = /<!DOCTYPE/i.test(html);
    const isFullPage = hasHead || hasHtml || hasDoctype;

    if (isFullPage) {
      if (hasHead) {
        html = html.replace(/(<head[\s>][^>]*>|<head>)/i, (m: string) => m + fullHeaderInjection);
      } else if (hasHtml) {
        html = html.replace(/(<html[\s>][^>]*>|<html>)/i, (m: string) => m + fullHeaderInjection);
      } else {
        html = fullHeaderInjection + html;
      }
    }

    const response = new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
    response.cookies.set('active_proxy_origin', targetOrigin, {
      path: '/api/proxy',
      maxAge: 3600,
      sameSite: 'lax',
    });
    // Clear legacy root cookie if present
    response.cookies.set('active_proxy_origin', '', {
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (error: any) {
    console.error(`[Proxy Error] Failed to proxy URL ${targetUrl}:`, error);
    return new NextResponse(`Error proxying page: ${error.message}`, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  if (!isAllowedUrl(targetUrl)) {
    return new NextResponse('URL not allowed', { status: 403 });
  }

  try {
    const bodyText = await request.text();
    const parsedTarget = new URL(targetUrl);
    
    let spoofReferer = parsedTarget.origin + '/';
    if (spoofReferer.includes('dantri.com.vn') || spoofReferer.includes('vcmedia.vn') || spoofReferer.includes('dantricdn.com') || spoofReferer.includes('vccorp.vn')) {
      spoofReferer = 'https://dantri.com.vn/';
    } else if (spoofReferer.includes('tuoitre.vn') || spoofReferer.includes('tuoitrecdn.net')) {
      spoofReferer = 'https://tuoitre.vn/';
    }
    
    const reqHeaders = new Headers();
    reqHeaders.set('Referer', spoofReferer);
    reqHeaders.set('User-Agent', request.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    const clientContentType = request.headers.get('content-type');
    if (clientContentType) reqHeaders.set('Content-Type', clientContentType);

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: reqHeaders,
      body: bodyText,
    });

    const resBody = await res.arrayBuffer();
    return new NextResponse(resBody, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    return new NextResponse('Proxy POST Error: ' + err.message, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
