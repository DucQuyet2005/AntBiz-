import { chromium } from 'playwright';

async function main() {
  const url = 'https://gocnhinmoi.com.vn/cha-me-gia-can-nguoi-quan-ly-tien-hay-nguoi-dong-hanh-82144';
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const text = await page.innerText('body');
    console.log('--- BODY TEXT ---');
    console.log(text);
  } catch (err: any) {
    console.error('FAILED', err);
  } finally {
    await browser.close();
  }
}
main();
