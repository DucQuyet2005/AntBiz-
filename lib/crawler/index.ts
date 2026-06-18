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
 * Crawl a JS-rendered URL using headless Chromium.
 * Equivalent to crawl_url() in auto_post_pipeline.py
 */
export async function crawlUrl(url: string): Promise<CrawlResult> {
  console.log(`\n📥 [Crawler] Crawling: ${url}`);

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Scroll down to load dynamic/Spotlight content (lazy-loaded images and text elements)
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(150);
    }

    const title = await page.title();
    let contentHtml = '';

    // Try selectors in order of specificity (same as Python version)
    for (const selector of ['#html_content', 'article', 'main', "[class*='content']", 'body']) {
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
      throw new Error(`Không crawl được nội dung từ: ${url}`);
    }

    console.log(`   ✅ Crawl thành công — HTML dài ${contentHtml.length} ký tự`);

    return {
      url,
      title,
      contentHtml,
      fullPageHtml,
      crawledAt: new Date().toISOString(),
    };
  } finally {
    await browser.close();
  }
}
