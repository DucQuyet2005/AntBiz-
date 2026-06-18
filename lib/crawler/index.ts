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
}

/**
 * [ĐÃ COMMENT LẠI CÁCH CŨ (PLAYWRIGHT) ĐỂ DEPLOY VERCEL]
 * 
 * export async function crawlUrl(url: string): Promise<CrawlResult> {
 *   console.log(`\\n📥 [Crawler] Crawling: ${url}`);
 * 
 *   const browser = await chromium.launch({ headless: true });
 * 
 *   try {
 *     const page = await browser.newPage({
 *       userAgent:
 *         'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
 *         'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
 *     });
 * 
 *     await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
 *     await page.waitForTimeout(2000);
 * 
 *     // Scroll down to load dynamic/Spotlight content (lazy-loaded images and text elements)
 *     for (let i = 0; i < 15; i++) {
 *       await page.evaluate(() => window.scrollBy(0, 800));
 *       await page.waitForTimeout(150);
 *     }
 * 
 *     const title = await page.title();
 *     let contentHtml = '';
 * 
 *     // Try selectors in order of specificity (same as Python version)
 *     for (const selector of ['#html_content', 'article', 'main', "[class*='content']", 'body']) {
 *       const el = await page.$(selector);
 *       if (el) {
 *         const html = await el.innerHTML();
 *         if (html.trim()) {
 *           contentHtml = html;
 *           break;
 *         }
 *       }
 *     }
 * 
 *     const fullPageHtml = await page.content();
 * 
 *     if (!contentHtml.trim()) {
 *       throw new Error(`Không crawl được nội dung từ: ${url}`);
 *     }
 * 
 *     console.log(`   ✅ Crawl thành công — HTML dài ${contentHtml.length} ký tự`);
 * 
 *     return {
 *       url,
 *       title,
 *       contentHtml,
 *       fullPageHtml,
 *       crawledAt: new Date().toISOString(),
 *     };
 *   } finally {
 *     await browser.close();
 *   }
 * }
 */

/**
 * CÁCH MỚI: Dùng Firecrawl API (Thân thiện với Vercel Serverless)
 */
export async function crawlUrl(url: string): Promise<CrawlResult> {
  console.log(`\n📥 [Firecrawl API] Crawling: ${url}`);

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
        url: url,
        formats: ['html'], // Request HTML format to process with Cheerio
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

    console.log(`   ✅ Crawl thành công qua Firecrawl — HTML dài ${html.length} ký tự`);

    return {
      url,
      title,
      contentHtml: html,
      fullPageHtml: html,
      crawledAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error(`[Firecrawl API] Lỗi cào dữ liệu từ ${url}:`, error.message || error);
    throw error;
  }
}
