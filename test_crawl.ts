import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const url = 'https://gocnhinmoi.com.vn/hoc-van-khong-phai-dao-cu-truyen-thong-cua-nguoi-noi-tieng-1-82352';
  console.log(`Crawl: ${url}`);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Find html contents
    const htmlContent = await page.locator('#html_content').innerHTML().catch(() => '');
    const bodyHtml = await page.locator('body').innerHTML().catch(() => '');
    
    console.log(`htmlContent length: ${htmlContent.length}`);
    console.log(`bodyHtml length: ${bodyHtml.length}`);
    
    fs.writeFileSync(path.join(__dirname, 'html_content.html'), htmlContent);
    fs.writeFileSync(path.join(__dirname, 'body_content.html'), bodyHtml);
    console.log('Done!');
  } catch (e: any) {
    console.error(e);
  } finally {
    await browser.close();
  }
}

main();
