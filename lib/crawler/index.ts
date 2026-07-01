/**
 * lib/crawler/index.ts
 * TypeScript replacement for python/auto_post_pipeline.py → crawl_url()
 * Uses Playwright npm (same Chromium engine, no Python needed)
 */

import { chromium } from 'playwright';

export interface CrawlResult {
  url: string;
  title: string;
  contentHtml: string;
  fullPageHtml: string;
  crawledAt: string;
  metadata?: any;
}

/**
 * Hybrid Crawler: Dùng Playwright khi chạy Local (để lấy DOM đầy đủ và bypass Cloudflare/chặn bot dễ dàng),
 * tự động fallback sang Firecrawl API khi deploy lên Vercel Serverless.
 */
export async function crawlUrl(url: string): Promise<CrawlResult> {
  // Nếu là link facebook, tự động chuyển đổi sang mbasic.facebook.com để bypass login popup dễ dàng
  let targetUrl = url;
  if (url.includes('facebook.com') && !url.includes('mbasic.facebook.com') && !url.includes('m.facebook.com')) {
    targetUrl = url.replace('www.facebook.com', 'mbasic.facebook.com');
  }

  // Ưu tiên chạy Playwright trên cả local và deploy. Chỉ dùng Firecrawl khi FORCE_FIRECRAWL === 'true'
  const usePlaywright = process.env.FORCE_FIRECRAWL !== 'true';

  if (usePlaywright) {
    try {
      console.log(`\n📥 [Playwright] Crawling: ${targetUrl}`);
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage({
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        });

        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
        
        // Chờ skeleton loading (nếu có) biến mất trước khi bắt đầu cào dữ liệu
        try {
          await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 10000 });
        } catch (e) {
          // Bỏ qua nếu không có hoặc bị quá hạn chờ
        }
        await page.waitForTimeout(1000);

        // Cuộn trang xuống để load dynamic content / Spotlight content
        for (let i = 0; i < 8; i++) {
          await page.evaluate(() => window.scrollBy(0, 800));
          await page.waitForTimeout(150);
        }

        const title = await page.title();
        let contentHtml = '';

        // Thử tìm theo độ ưu tiên của các selector (có hỗ trợ thêm các selector bài đăng Facebook)
        const selectors = [
          'div[data-ad-preview="message"]',
          'div[dir="auto"]',
          '#html_content',
          'article',
          'main',
          "[class*='content']",
          'body'
        ];

        for (const selector of selectors) {
          const el = await page.$(selector);
          if (el) {
            const html = await el.innerHTML();
            if (html.trim()) {
              contentHtml = html;
              break;
            }
          }
        }

        const fullPageHtml = await page.content();

        if (!contentHtml.trim()) {
          throw new Error(`Không crawl được nội dung từ: ${targetUrl}`);
        }

        console.log(`   ✅ [Local Playwright] Crawl thành công — HTML dài ${contentHtml.length} ký tự`);

        return {
          url: targetUrl,
          title,
          contentHtml,
          fullPageHtml,
          crawledAt: new Date().toISOString(),
        };
      } finally {
        await browser.close();
      }
    } catch (playwrightError: any) {
      console.warn(`⚠️ [Local Playwright] Lỗi hoặc thiếu thư viện, tự động chuyển sang Firecrawl:`, playwrightError.message || playwrightError);
    }
  }

  // Cách dự phòng hoặc chạy trên Vercel: Dùng Firecrawl API
  console.log(`\n📥 [Firecrawl API] Crawling: ${targetUrl}`);

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error('Chưa cấu hình FIRECRAWL_API_KEY trong biến môi trường (.env.local hoặc Vercel Settings)');
  }

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ['html'], // Request HTML format
        actions: [
          { type: 'scroll', direction: 'down' },
          { type: 'wait', milliseconds: 1500 }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl API trả về lỗi: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Yêu cầu crawl thất bại từ Firecrawl');
    }

    const title = result.data.metadata?.title || 'Bài viết không tên';
    const html = result.data.html || '';

    console.log(`   ✅ [Firecrawl API] Crawl thành công — HTML dài ${html.length} ký tự`);

    return {
      url: targetUrl,
      title,
      contentHtml: html,
      fullPageHtml: html,
      crawledAt: new Date().toISOString(),
      metadata: result.data.metadata,
    };
  } catch (error: any) {
    console.error(`[Firecrawl API] Lỗi cào dữ liệu từ ${targetUrl}:`, error.message || error);
    throw error;
  }
}
