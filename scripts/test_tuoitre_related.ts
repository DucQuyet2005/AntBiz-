import { crawlUrl } from '../lib/crawler/index';
import { preprocessArticle } from '../lib/crawler/preprocess';

async function main() {
  const url = 'https://tuoitre.vn/chu-tich-nguyen-van-duoctphcm-huy-dong-moi-nguon-luc-de-ve-dich-tang-truong-hai-con-so-100260708085145768.htm';
  console.log(`Crawling and preprocessing: ${url}`);
  const raw = await crawlUrl(url);
  const res = preprocessArticle(raw);
  
  if (res.type === 'ARTICLE') {
    console.log('\n--- Title ---');
    console.log(res.title);
    
    console.log('\n--- Body Blocks ---');
    res.body.forEach((block, idx) => {
      console.log(`Block ${idx} [${block.type}]: ${block.text || block.url}`);
    });
    
    const containsRelatedText = res.full_text.includes('Xuyên Tâm') || res.full_text.includes('sẵn sàng 100%');
    console.log(`\nContains related article text: ${containsRelatedText}`);
    
    const hasRelatedImage = res.images.some(img => img.url.includes('z7988755778805'));
    console.log(`Contains related article image: ${hasRelatedImage}`);
  }
}

main().catch(console.error);
