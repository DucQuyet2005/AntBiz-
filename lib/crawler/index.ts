import { chromium } from 'playwright';
import dns from 'dns';

export interface CrawlResult {
  url: string;
  title: string;
  contentHtml: string;
  fullPageHtml: string;
  crawledAt: string;
  metadata?: any;
}

/**
 * Kiểm tra xem URL đích có an toàn hay không (không trỏ vào IP nội bộ, localhost, loopback).
 */
export async function isSafeUrl(urlStr: string): Promise<boolean> {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname;

    // Chặn localhost, loopback trực tiếp
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]'
    ) {
      return false;
    }

    // DNS Lookup để lấy IP thực tế
    const lookup = await dns.promises.lookup(hostname).catch(() => null);
    if (!lookup) {
      return false;
    }
    const ip = lookup.address;

    // Kiểm tra các dải IPv4 riêng tư
    if (ip.includes('.')) {
      const parts = ip.split('.').map(Number);
      if (parts.length !== 4 || parts.some(isNaN)) return false;

      const isLoopback = parts[0] === 127;
      const isPrivateA = parts[0] === 10;
      const isPrivateB = parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31;
      const isPrivateC = parts[0] === 192 && parts[1] === 168;
      const isLinkLocal = parts[0] === 169 && parts[1] === 254;
      const isZero = parts[0] === 0;

      if (isLoopback || isPrivateA || isPrivateB || isPrivateC || isLinkLocal || isZero) {
        return false;
      }
    }

    // Kiểm tra các dải IPv6 riêng tư
    if (ip.includes(':')) {
      const cleanIp = ip.toLowerCase();
      if (
        cleanIp === '::1' ||
        cleanIp === '::' ||
        cleanIp.startsWith('fe80:') ||
        cleanIp.startsWith('fc00:') ||
        cleanIp.startsWith('fd00:')
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Hybrid Crawler: Dùng Playwright khi chạy Local (để lấy DOM đầy đủ và bypass Cloudflare/chặn bot dễ dàng),
 * tự động fallback sang Firecrawl API khi deploy lên Vercel Serverless.
 */
export async function crawlUrl(url: string): Promise<CrawlResult> {
  // SSRF Protection check
  const isSafe = await isSafeUrl(url);
  if (!isSafe) {
    throw new Error('Địa chỉ URL đích không được phép truy cập (bị chặn bởi chính sách SSRF Protection).');
  }

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

        // Tối ưu cho VPS/Local: Chặn tài nguyên thừa (CSS, hình ảnh, fonts, quảng cáo, tracking)
        // giúp crawl nhanh hơn 5-10 lần, tiết kiệm băng thông và CPU/RAM
        await page.route('**/*', (route) => {
          const type = route.request().resourceType();
          const reqUrl = route.request().url().toLowerCase();
          const blockTypes = ['image', 'stylesheet', 'media', 'font'];
          const blockDomains = [
            'google-analytics', 'googletagmanager', 'facebook', 'connect.facebook',
            'doubleclick', 'adnxs', 'pubmatic', 'adsystem', 'analytics', 'ads'
          ];
          
          const shouldBlock = blockTypes.includes(type) || 
                              blockDomains.some(domain => reqUrl.includes(domain));
                              
          if (shouldBlock) {
            route.abort();
          } else {
            route.continue();
          }
        });

        // Dùng 'domcontentloaded' cực kỳ ổn định, tránh timeout do quảng cáo load vô tận
        try {
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        } catch (e: any) {
          console.warn(`⚠️ [Playwright] page.goto timeout or error, proceeding to parse anyway: ${e.message || e}`);
        }
        
        // Chờ skeleton loading (nếu có) biến mất
        try {
          await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 3000 });
        } catch (e) {
          // Bỏ qua nếu không có
        }
        await page.waitForTimeout(500);


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
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (apiKey) {
    console.log(`\n📥 [Firecrawl API] Crawling: ${targetUrl}`);
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

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
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
        }
      }
    } catch (firecrawlError: any) {
      console.warn(`⚠️ [Firecrawl API] Lỗi cào dữ liệu, thử phương pháp Simple Fetch:`, firecrawlError.message || firecrawlError);
    }
  } else {
    console.warn('⚠️ Chưa cấu hình FIRECRAWL_API_KEY, tự động chuyển sang Simple Fetch.');
  }

  // Phương pháp cào dữ liệu thứ 3: Simple HTTP Fetch (đảm bảo cào được HTML tĩnh nếu Playwright và Firecrawl đều không hoạt động)
  console.log(`\n📥 [Simple Fetch Fallback] Fetching: ${targetUrl}`);
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Simple fetch failed with status: ${response.status}`);
    }

    const html = await response.text();
    console.log(`   ✅ [Simple Fetch Fallback] Crawl thành công — HTML dài ${html.length} ký tự`);

    return {
      url: targetUrl,
      title: '',
      contentHtml: html,
      fullPageHtml: html,
      crawledAt: new Date().toISOString(),
    };
  } catch (simpleFetchError: any) {
    console.error(`[Simple Fetch Fallback] Lỗi cào dữ liệu từ ${targetUrl}:`, simpleFetchError.message || simpleFetchError);
    throw new Error(`Tất cả các phương pháp cào dữ liệu (Playwright, Firecrawl, Simple Fetch) đều thất bại.`);
  }

}
