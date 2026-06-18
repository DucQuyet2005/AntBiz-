import { crawlUrl } from '../lib/crawler/index';
import * as cheerio from 'cheerio';

const URL = 'https://gocnhinmoi.com.vn/space-x-vua-ipo-mo-hinh-kinh-doanh-the-he-thu-4-da-xuat-hien-82122';

async function main() {
  const raw = await crawlUrl(URL);
  const html = raw.fullPageHtml || '';
  const $ = cheerio.load(html);

  // Tìm __NEXT_DATA__ để lấy raw view count
  const nextDataScript = $('script#__NEXT_DATA__').html();
  if (nextDataScript) {
    try {
      const nextData = JSON.parse(nextDataScript);
      const propsStr = JSON.stringify(nextData).slice(0, 5000);
      // Tìm các field liên quan đến views/viewCount
      const viewMatch = JSON.stringify(nextData).match(/"view[a-zA-Z]*"\s*:\s*(\d+)/gi);
      console.log('View fields in __NEXT_DATA__:', viewMatch);
      // Tìm field "views" hoặc "view_count"
      const allMatches = JSON.stringify(nextData).match(/"(views?|view_count|viewCount|totalView|reads?|hits?|impressions?)"\s*:\s*[^\s,}]+/gi);
      console.log('All view-related fields:', allMatches);
      // Tìm số có thể là view count (500-99999)
      const numMatches = JSON.stringify(nextData).match(/"[^"]+"\s*:\s*\d{3,6}/gi);
      console.log('\nAll numeric fields (3-6 digits):', numMatches?.slice(0, 30));
    } catch (e) {
      console.error('Parse __NEXT_DATA__ lỗi:', e);
    }
  } else {
    console.log('Không có __NEXT_DATA__ trong trang');
  }

  // Cũng tìm các script có chứa dữ liệu view
  console.log('\n=== TÌM TRONG TẤT CẢ SCRIPT TAG ===');
  $('script').each((i, el) => {
    const content = $(el).html() || '';
    if (content.includes('996') || content.includes('"view') || content.includes('viewCount')) {
      console.log(`Script[${i}] chứa view data (${content.length} chars):`, content.slice(0, 300));
    }
  });

  // Kiểm tra HTML của contentHtml (1029 chars - rất nhỏ)
  console.log('\n=== CONTENT HTML (bài Steve Jobs) ===');
  console.log('contentHtml length:', raw.contentHtml.length);
  console.log('contentHtml preview:', raw.contentHtml.slice(0, 500));
}

main().catch(console.error);
