import { crawlUrl } from '../lib/crawler/index';
import * as fs from 'fs';

async function main() {
  const url = 'https://dantri.com.vn/dt360/hang-tram-nghin-nguoi-tien-dua-lanh-tu-toi-cao-iran-ali-khamenei-20260707132410216.htm';
  const raw = await crawlUrl(url);
  fs.writeFileSync('d:/AntBiz-/dt360_playwright.html', raw.fullPageHtml);
  console.log(`Saved fullPageHtml. Length: ${raw.fullPageHtml.length}`);
  console.log(`Saved contentHtml. Length: ${raw.contentHtml.length}`);
}

main().catch(console.error);
