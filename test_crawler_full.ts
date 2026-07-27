import { crawlUrl } from './lib/crawler/index';
import { preprocessArticle } from './lib/crawler/preprocess';

async function run() {
  const urls = [
    'https://gocnhinmoi.com.vn/hoc-van-khong-phai-dao-cu-truyen-thong-cua-nguoi-noi-tieng-1-82352',
    'https://dantri.com.vn/the-gioi/nga-kien-quyet-khong-tra-lai-cho-ukraine-4-vung-lanh-tho-da-sap-nhap-20240905101037562.htm'
  ];

  for (const url of urls) {
    console.log(`\n================================`);
    console.log(`Testing URL: ${url}`);
    try {
      const crawlResult = await crawlUrl(url);
      const processed = preprocessArticle(crawlResult);
      if (processed.type === 'ARTICLE') {
        console.log(`Title: ${processed.title}`);
        console.log(`Author: ${processed.author}`);
        console.log(`Description: ${processed.description}`);
        console.log(`Body paragraphs/blocks: ${processed.body.length}`);
        console.log(`Images extracted: ${processed.images.length}`);
        // Log first few paragraphs
        const paras = processed.body.filter(b => b.type === 'paragraph').slice(0, 3);
        console.log(`First few paras:`, paras.map(p => p.text));
      } else {
        console.log('Result was a listing.');
      }
    } catch (e) {
      console.error(`Error processing ${url}`, e);
    }
  }
  process.exit(0);
}

run();
