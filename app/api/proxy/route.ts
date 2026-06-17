import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTNAME = 'gocnhinmoi.com.vn';

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === ALLOWED_HOSTNAME ||
      parsed.hostname.endsWith('.' + ALLOWED_HOSTNAME)
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
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
    const targetOrigin = new URL(targetUrl).origin; // https://gocnhinmoi.com.vn

    // ── 1. Rewrite relative src / srcset to absolute CDN paths ───────────────
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

      // Only proxy gocnhinmoi page URLs
      const parsed = new URL(absolute);
      if (
        parsed.hostname === ALLOWED_HOSTNAME ||
        parsed.hostname.endsWith('.' + ALLOWED_HOSTNAME)
      ) {
        return `${attr}${q}/api/proxy?url=${encodeURIComponent(absolute)}${q}`;
      }

      // External link → leave as absolute
      return `${attr}${q}${absolute}${q}`;
    });

    // ── 3. Remove framing restrictions ───────────────────────────────────────
    html = html.replace(/<meta[^>]+http-equiv=["']X-Frame-Options["'][^>]*>/gi, '');
    html = html.replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');

    // ── 4. Inject navigation interceptor into <head> BEFORE any JS ───────────
    //
    //  Strategy:
    //   • Override history.pushState → redirect through /api/proxy (client-side nav)
    //   • Do NOT override replaceState → Next.js uses this safely during hydration
    //   • Capture-phase click listener → catches <Link> clicks before React handler
    //   • Both together ensure no navigation ever escapes the proxy iframe
    //
    const interceptorScript = `<script>
(function () {
  var PROXY = '/api/proxy?url=';
  var TARGET = ${JSON.stringify(targetUrl)};

  /* ── Report current page URL to parent AntBiz window ── */
  function report() {
    try { window.parent.postMessage({ type: 'URL_CHANGE', url: TARGET }, '*'); } catch (_) {}
  }
  report();
  setInterval(report, 800);

  /* ── Override pushState to redirect client-side navigations through proxy ── */
  var _origPush = history.pushState.bind(history);
  history.pushState = function (state, title, url) {
    if (url) {
      try {
        var abs = new URL(String(url), TARGET).href;
        // Only intercept same-site navigations
        if (abs.indexOf('gocnhinmoi.com.vn') !== -1) {
          window.location.replace(PROXY + encodeURIComponent(abs));
          return;
        }
      } catch (_) {}
    }
    return _origPush(state, title, url);
  };

  /* ── Capture-phase click interceptor (belt-and-suspenders) ── */
  document.addEventListener('click', function (e) {
    /* Walk up from the clicked element to find an <a> */
    var el = e.target;
    while (el && el.tagName !== 'A') el = el.parentElement;
    if (!el) return;

    var href = el.getAttribute('href');
    if (!href) return;

    /* Leave special links alone */
    if (
      href.charAt(0) === '#' ||
      href.indexOf('javascript:') === 0 ||
      href.indexOf('mailto:') === 0 ||
      href.indexOf('tel:') === 0
    ) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    try {
      /* Already a proxied URL */
      if (href.indexOf('/api/proxy?') !== -1) {
        window.location.href = new URL(href, window.location.origin).href;
        return;
      }
      var abs = new URL(href, TARGET).href;
      window.location.href = PROXY + encodeURIComponent(abs);
    } catch (err) {
      console.error('[AntBiz Proxy] nav error', err);
    }
  }, true /* capture phase */);
})();
</script>`;

    // Insert into <head> — before any other scripts
    if (/<head[\s>]/i.test(html)) {
      html = html.replace(/(<head[\s>][^>]*>|<head>)/i, (m: string) => m + interceptorScript);
    } else {
      html = interceptorScript + html;
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
