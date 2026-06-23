import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function saveHtml(url: string, filename: string) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    try {
      await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 10000 });
    } catch(e) {}
    await page.waitForTimeout(2000);
    const html = await page.content();
    fs.writeFileSync(path.join(__dirname, filename), html, 'utf-8');
    console.log(`Saved ${url} to ${filename}`);
  } catch (err) {
    console.error(err);
  } finally {
    browser.close();
  }
}

async function run() {
  await saveHtml('https://gocnhinmoi.com.vn/khong-chi-thong-tin-niem-tin-moi-la-tai-san-dat-gia-nhat-cua-bao-chi-82236', 'article-1.html');
  await saveHtml('https://gocnhinmoi.com.vn/dien-anh-viet-khong-the-chi-song-bang-noi-so-82302', 'article-2.html');
}

run();
