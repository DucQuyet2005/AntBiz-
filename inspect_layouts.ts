import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

async function inspect(url: string) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const html = await page.content();
    const $ = cheerio.load(html);

    console.log(`\n========================================`);
    console.log(`URL: ${url}`);
    console.log(`Title tag: ${$('title').text().trim()}`);
    console.log(`H1 tag: ${$('h1').text().trim()}`);
    console.log(`og:title: ${$('meta[property="og:title"]').attr('content')}`);
    console.log(`og:description: ${$('meta[property="og:description"]').attr('content')}`);

    // Find any potential article containers
    console.log(`Has #html_content: ${!!$('#html_content').length}`);
    console.log(`Has article: ${!!$('article').length}`);
    console.log(`Has main: ${!!$('main').length}`);

    // Look for all paragraphs with text and print their parents/classes
    const paragraphs = $('p');
    console.log(`Total paragraphs found: ${paragraphs.length}`);
    
    // Find divs with many paragraphs
    const parentCounts = new Map<string, number>();
    paragraphs.each((_, el) => {
      const p = $(el);
      const text = p.text().trim();
      if (text.length > 30) {
        let parent = p.parent();
        let path = parent.prop('tagName') || '';
        const id = parent.attr('id');
        const cls = parent.attr('class');
        if (id) path += `#${id}`;
        if (cls) path += `.${cls.split(' ').join('.')}`;
        parentCounts.set(path, (parentCounts.get(path) || 0) + 1);
      }
    });

    console.log('Divs/Elements containing long paragraphs:');
    parentCounts.forEach((count, path) => {
      console.log(`  - ${path} has ${count} long paragraphs`);
    });

    // Check images
    const images = $('img');
    console.log(`Total images: ${images.length}`);
    images.slice(0, 5).each((idx, el) => {
      console.log(`  - Image ${idx}: src=${$(el).attr('src')}, alt=${$(el).attr('alt')}, data-url=${$(el).attr('data-url')}`);
    });

    // Check tags
    console.log('Links containing /tag/ or /hashtag/:');
    $('a').each((_, el) => {
      const a = $(el);
      const href = a.attr('href') || '';
      if (href.includes('/tag/') || href.includes('/hashtag/')) {
        console.log(`  - href=${href}, text=${a.text().trim()}`);
      }
    });

  } catch (e: any) {
    console.error('Inspect failed for', url, e.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await inspect('https://gocnhinmoi.com.vn/khi-hinh-anh-rut-lui-vao-vat-chat-1780978979-81914');
  await inspect('https://gocnhinmoi.com.vn/cha-me-gia-can-nguoi-quan-ly-tien-hay-nguoi-dong-hanh-82144');
}

main();
