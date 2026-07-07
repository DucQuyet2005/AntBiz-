import { crawlUrl } from '../lib/crawler/index';
import { preprocessArticle } from '../lib/crawler/preprocess';

const testUrls = [
  // Dantri Standard
  'https://dantri.com.vn/noi-vu/them-tinh-kien-nghi-sap-nhap-xa-phuong-de-mo-rong-khong-gian-phat-trien-20260706204007364.htm',
  // Dantri Event (Listing)
  'https://dantri.com.vn/event/ban-sac-viet-nam-123.htm',
  // Tuoitre Standard
  'https://tuoitre.vn/5-tuyet-ky-bien-broly-thanh-quai-vat-chien-dau-cua-dragon-ball-100260707004851403.htm',
  // Tuoitre Chuyen de (Listing)
  'https://tuoitre.vn/50-nam-thanh-pho-mang-ten-bac-e2047.htm'
];

async function main() {
  for (const url of testUrls) {
    try {
      console.log(`\n==================================================`);
      console.log(`Testing URL: ${url}`);
      const raw = await crawlUrl(url);
      const res = preprocessArticle(raw);
      console.log(`Result Type: ${res.type}`);
      if (res.type === 'LISTING') {
        console.log(`Listing Warning: ${res.warning}`);
        console.log(`Extracted URLs Count: ${res.extractedUrls.length}`);
        console.log(`Sample URLs:`, res.extractedUrls.slice(0, 5));
      } else {
        console.log(`Article Title: ${res.title}`);
        console.log(`Article Author: ${res.author}`);
        console.log(`Article Date: ${res.published_at}`);
        console.log(`Article Category: ${res.category}`);
        console.log(`Body blocks count: ${res.body.length}`);
        console.log(`Images count: ${res.images.length}`);
        console.log(`Description: ${res.description}`);
        console.log(`Full Text Length: ${res.full_text.length}`);
      }
    } catch (err: any) {
      console.error(`Error testing ${url}:`, err.message || err);
    }
  }
}

main().catch(console.error);
