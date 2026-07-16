import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';

// Chỉ cho phép screenshot các domain tin tức đã whitelist
const ALLOWED_ORIGINS = [
  'https://gocnhinmoi.com.vn',
  'https://tuoitre.vn',
  'https://dantri.com.vn',
];

// In-memory cache: url → { png bytes, timestamp }
const cache = new Map<string, { data: Uint8Array; ts: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 phút

function isAllowed(url: string): boolean {
  return ALLOWED_ORIGINS.some((origin) => url.startsWith(origin));
}

export async function GET(request: NextRequest) {
  const { unauthorized } = await requireUserWithRole([
    'admin',
    'marketer_full',
    'marketer_content',
  ]);
  if (unauthorized) return unauthorized;

  const targetUrl = request.nextUrl.searchParams.get('url');
  if (!targetUrl || !isAllowed(targetUrl)) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
  }

  // Return from cache if fresh
  const hit = cache.get(targetUrl);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return new NextResponse(hit.data as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=1800',
      },
    });
  }

  // ── Method 1: Playwright (local / VPS) ───────────────────────────────────
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    let screenshotBuf: Uint8Array | null = null;
    try {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 800 },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      });

      // Block heavy resources to speed up the preview
      await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (['media', 'font'].includes(type)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 18000 });
      } catch {
        // Continue even on partial load
      }

      // Brief pause so above-the-fold content renders
      await page.waitForTimeout(1500);

      const png = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: 1280, height: 800 },
      });

      screenshotBuf = new Uint8Array(png.buffer, png.byteOffset, png.byteLength);
    } finally {
      await browser.close().catch(() => undefined);
    }

    if (screenshotBuf) {
      cache.set(targetUrl, { data: screenshotBuf, ts: Date.now() });
      return new NextResponse(screenshotBuf as unknown as BodyInit, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=1800',
        },
      });
    }
  } catch {
    // Playwright not available — fall through to Firecrawl
  }

  // ── Method 2: Firecrawl screenshot (Vercel / serverless fallback) ─────────
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (apiKey) {
    try {
      const fc = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: targetUrl,
          formats: ['screenshot'],
          waitFor: 1500,
        }),
      });

      if (fc.ok) {
        const result = await fc.json();
        const screenshotUrl: string | undefined = result.data?.screenshot;
        if (screenshotUrl) {
          // Proxy the image bytes so the client doesn't need cross-origin access
          const imgRes = await fetch(screenshotUrl);
          if (imgRes.ok) {
            const bytes = new Uint8Array(await imgRes.arrayBuffer());
            cache.set(targetUrl, { data: bytes, ts: Date.now() });
            return new NextResponse(bytes as unknown as BodyInit, {
              headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=1800',
              },
            });
          }
        }
      }
    } catch {
      // Fall through
    }
  }

  return NextResponse.json({ error: 'Screenshot unavailable' }, { status: 503 });
}
