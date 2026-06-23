import { chromium } from 'playwright';

async function inspectUrl(url: string) {
  console.log(`\n=== Inspecting URL: ${url} ===`);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    });
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for the skeleton loader to disappear
    try {
      await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 10000 });
    } catch (e) {
      console.log("Timeout waiting for .animate-pulse to detach or it wasn't present.");
    }
    
    // Give it another 1s buffer
    await page.waitForTimeout(1000);

    // Let's inspect the HTML of the main container
    const h1Text = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? { text: h1.innerText, outerHTML: h1.outerHTML } : null;
    });
    console.log("H1 Title:", h1Text);

    // Inspect author / date
    const metaInfo = await page.evaluate(() => {
      // Look for author/date indicators
      const links = Array.from(document.querySelectorAll('a[href*="/authors/"], a[href*="/author/"]'));
      const spans = Array.from(document.querySelectorAll('span'));
      const paragraphs = Array.from(document.querySelectorAll('p'));
      
      return {
        authorsLinks: links.map(l => ({ text: l.innerText, href: l.getAttribute('href') })),
        likelyAuthorSpans: spans.filter(s => s.className.includes('bold') || s.className.includes('gray-900')).map(s => ({ text: s.innerText, className: s.className })),
        likelyDateParagraphs: paragraphs.filter(p => p.className.includes('gray-400') || p.className.includes('gray-500')).map(p => ({ text: p.innerText, className: p.className }))
      };
    });
    console.log("Meta Info:", JSON.stringify(metaInfo, null, 2));

    // Inspect content body selector
    const bodySelectors = await page.evaluate(() => {
      // Find the selector that contains the main text content
      const selectors = ['#html_content', 'article', 'main', "[class*='content']"];
      return selectors.map(sel => {
        const el = document.querySelector(sel);
        if (!el) return { selector: sel, exists: false };
        return {
          selector: sel,
          exists: true,
          id: el.id,
          className: el.className,
          textLength: el.innerText.length,
          paragraphsCount: el.querySelectorAll('p').length
        };
      });
    });
    console.log("Body Selectors status:", bodySelectors);
    
    // Let's check where the actual text content resides.
    // Usually it has paragraphs
    const paragraphsSample = await page.evaluate(() => {
      const pList = Array.from(document.querySelectorAll('p'));
      return pList.map(p => ({ text: p.innerText.substring(0, 100), className: p.className })).slice(0, 15);
    });
    console.log("Paragraphs sample:", paragraphsSample);

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

async function run() {
  await inspectUrl('https://gocnhinmoi.com.vn/khong-chi-thong-tin-niem-tin-moi-la-tai-san-dat-gia-nhat-cua-bao-chi-82236');
  await inspectUrl('https://gocnhinmoi.com.vn/dien-anh-viet-khong-the-chi-song-bang-noi-so-82302');
}

run();
