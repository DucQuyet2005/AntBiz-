import { crawlUrl } from '../lib/crawler';
import { preprocessArticle } from '../lib/crawler/preprocess';

async function test(url: string) {
  console.log(`\n=== Testing actual crawl for: ${url} ===`);
  try {
    const raw = await crawlUrl(url);
    const preprocessed = preprocessArticle(raw);
    console.log("Title:", preprocessed.title);
    console.log("Category:", preprocessed.category);
    console.log("Description:", preprocessed.description);
    console.log("Author:", preprocessed.author);
    console.log("Published At:", preprocessed.published_at);
    console.log("Body length:", preprocessed.body.length);
    console.log("Body sample:", preprocessed.body.slice(0, 3));
    console.log("Full text length:", preprocessed.full_text.length);
    if (preprocessed.full_text.length > 0) {
      console.log("Full text sample:\n", preprocessed.full_text.substring(0, 300));
    }
  } catch (err) {
    console.error("Test failed:", err);
  }
}

async function run() {
  await test('https://gocnhinmoi.com.vn/khong-chi-thong-tin-niem-tin-moi-la-tai-san-dat-gia-nhat-cua-bao-chi-82236');
  await test('https://gocnhinmoi.com.vn/dien-anh-viet-khong-the-chi-song-bang-noi-so-82302');
}

run();
