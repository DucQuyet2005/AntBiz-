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
    

    // 1.5 Rewrite ALL images (src, data-src, data-original) to use proxy for Dantri
    if (needsImageProxy) {
      html = html.replace(/(\b(?:src|data-src|data-original)\s*=\s*)(['"])([^'"]+)\2/gi, (_m, attr, q, urlStr) => {
        if (urlStr.startsWith('data:') || urlStr.startsWith('blob:') || urlStr.startsWith('#')) return _m;
        if (urlStr.includes('/api/proxy?')) return _m;

        try {
          const absolute = new URL(urlStr, targetUrl).href;
          const u = new URL(absolute);
            if (u.hostname.includes('dantri.com.vn')) {
              return `${attr}${q}/api/proxy?url=${encodeURIComponent(absolute)}${q}`;
            }
          return `${attr}${q}${absolute}${q}`;
        } catch(e) {}
        return _m;
      });

      // Rewrite srcset and data-srcset
      html = html.replace(/(\b(?:srcset|data-srcset)\s*=\s*)(['"])([^'"]+)\2/gi, (_m, attr, q, srcset) => {
        const rewritten = srcset.replace(
          /(^|,\s*)([^\s,]+)/g,
          (_s: string, sep: string, urlStr: string) => {
            if (urlStr.startsWith('data:') || urlStr.startsWith('blob:') || urlStr.includes('/api/proxy?')) {
              return _s;
            }
            try {
              const absolute = new URL(urlStr, targetUrl).href;
              const u = new URL(absolute);
                if (u.hostname.includes('dantri.com.vn')) {
                  return `${sep}/api/proxy?url=${encodeURIComponent(absolute)}`;
                }
              return `${sep}${absolute}`;
            } catch(e) {
              return _s;
            }
          }
        );
        return `${attr}${q}${rewritten}${q}`;
      });
    }

    // ── 2. Remove framing restrictions ───────────────────────────────
    html = html.replace(/<meta[^>]+http-equiv=["']X-Frame-Options["'][^>]*>/gi, '');
    html = html.replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');

    // ── 3. Inject navigation interceptor into <head> BEFORE any JS ───────────

    const navigationScript = `
<script>
(function() {
  var TARGET = ${JSON.stringify(targetUrl)};
  var ALLOWED = ${JSON.stringify(ALLOWED_HOSTNAMES)};
  
  // ── 1. Fix SPA Routers (Dantri) ──
  // SPA routers read window.location.pathname to determine the page to render.
  try {
    var _parsedTarget = new URL(TARGET);
    var _targetPath = _parsedTarget.pathname + _parsedTarget.search + _parsedTarget.hash;
    if (window.location.pathname !== _parsedTarget.pathname) {
      window.history.replaceState(null, '', window.location.origin + _targetPath);
    }
  } catch(_e) {}

  // ── 2. Intercept Absolute Clicks ──
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (a && a.href) {
      try {
        var u = new URL(a.href);
        var isAllowed = ALLOWED.some(function(h) { return u.hostname === h || u.hostname.endsWith('.' + h); });
        // If it's an allowed absolute URL, route it through proxy
        if (isAllowed && u.origin !== window.location.origin) {
          e.preventDefault();
          window.location.href = '/api/proxy?url=' + encodeURIComponent(a.href);
        }
      } catch(ex) {}
    }
  }, true);

  // ── 3. Intercept Fetch for Next.js Data ──
  // Intercept relative fetches (like /_next/data/...) to ensure they go through proxy middleware
  // We rewrite them to the absolute proxy URL directly to bypass middleware's ignore rules
  var _fetch = window.fetch;
  window.fetch = function(input, init) {
    var url = typeof input === 'string' ? input : (input && input.url ? input.url : null);
    if (url && typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/api/proxy')) {
      try {
        var _parsedTarget2 = new URL(TARGET);
        url = '/api/proxy?url=' + encodeURIComponent(_parsedTarget2.origin + url);
        if (typeof input === 'string') {
          input = url;
        } else {
          input = new Request(url, init);
        }
      } catch(e) {}
    }
    return _fetch.call(window, input, init);
  };

  // ── 4. Intercept XMLHttpRequest ──
  var _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/api/proxy')) {
      try {
        var _parsedTarget3 = new URL(TARGET);
        url = '/api/proxy?url=' + encodeURIComponent(_parsedTarget3.origin + url);
      } catch(e) {}
    }
    var args = Array.prototype.slice.call(arguments);
    args[1] = url;
    return _open.apply(this, args);
  };

  // ── 5. Intercept Dynamically Added Images (Lazy Loading) ──
  if (typeof MutationObserver !== 'undefined') {
    var imgExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'];
    var imgPatterns = new RegExp('\\\\.(' + imgExts.map(function(e){return e.replace('.','')}).join('|') + ')(?:\\\\?.*)?$', 'i');
    
    function rewriteAttr(node, attrName) {
      if (!node.hasAttribute(attrName)) return;
      var val = node.getAttribute(attrName);
      if (!val || val.startsWith('data:') || val.startsWith('blob:') || val.indexOf(PROXY) === 0) return;
      
      // Check if it's an image or a known CDN
      if (imgPatterns.test(val) || val.indexOf('cdnphoto.dantri.com.vn') > -1 || val.indexOf('cdn.tuoitre.vn') > -1 || val.indexOf('gocnhinmoi.com') > -1) {
        try {
          var absolute = new URL(val, TARGET).href;
          node.setAttribute(attrName, PROXY + encodeURIComponent(absolute));
        } catch(e) {}
      }
    }

    function rewriteSrcset(node, attrName) {
      if (!node.hasAttribute(attrName)) return;
      var val = node.getAttribute(attrName);
      if (!val || val.indexOf(PROXY) > -1) return;
      
      var parts = val.split(',');
      var rewritten = parts.map(function(part) {
        var trimmed = part.trim();
        var tokens = trimmed.split(/\\s+/);
        if (tokens.length === 0 || !tokens[0]) return part;
        var urlStr = tokens[0];
        if (urlStr.startsWith('data:') || urlStr.startsWith('blob:') || urlStr.indexOf(PROXY) === 0) return part;
        try {
          var absolute = new URL(urlStr, TARGET).href;
          tokens[0] = PROXY + encodeURIComponent(absolute);
          return tokens.join(' ');
        } catch(e) { return part; }
      }).join(', ');
      
      node.setAttribute(attrName, rewritten);
    }

    function processImgNode(node) {
      if (node.tagName === 'IMG' || node.tagName === 'SOURCE') {
        rewriteAttr(node, 'src');
        rewriteAttr(node, 'data-src');
        rewriteAttr(node, 'data-original');
        rewriteSrcset(node, 'srcset');
        rewriteSrcset(node, 'data-srcset');
      }
      if (node.querySelectorAll) {
        var imgs = node.querySelectorAll('img, source');
        for (var i = 0; i < imgs.length; i++) {
          rewriteAttr(imgs[i], 'src');
          rewriteAttr(imgs[i], 'data-src');
          rewriteAttr(imgs[i], 'data-original');
          rewriteSrcset(imgs[i], 'srcset');
          rewriteSrcset(imgs[i], 'data-srcset');
        }
      }
    }

    var imgObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        if (m.type === 'childList') {
          m.addedNodes.forEach(function(node) {
            if (node.nodeType === 1) processImgNode(node);
          });
        } else if (m.type === 'attributes') {
          if (m.target.nodeType === 1 && (m.target.tagName === 'IMG' || m.target.tagName === 'SOURCE')) {
            // Prevent infinite loop by checking if we already proxied it inside processImgNode
            var val = m.target.getAttribute(m.attributeName);
            if (val && val.indexOf(PROXY) !== 0) {
              processImgNode(m.target);
            }
          }
        }
      });
    });
    
    // Ensure the body exists before observing, otherwise observe documentElement
    var targetNode = document.documentElement;
    imgObserver.observe(targetNode, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'data-src', 'srcset', 'data-srcset', 'data-original']
    });
  }
})();
</script>
`;

    // Do NOT inject <base href>. It breaks client-side routing and lazy-loading
    // because JS resolves paths to the real origin instead of the proxy.
    // The active_proxy_origin cookie and proxy.ts middleware already handle relative requests.
    const fullHeaderInjection = interceptorScript + navigationScript;

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
