import * as cheerio from 'cheerio';

async function main() {
  const url = 'https://tuoitre.vn/chu-tich-nguyen-van-duoctphcm-huy-dong-moi-nguon-luc-de-ve-dich-tang-truong-hai-con-so-100260708085145768.htm';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  $('.VCSortableInPreviewMode').each((_, el) => {
    const type = $(el).attr('type');
    const className = $(el).attr('class') || '';
    const text = $(el).text().trim().substring(0, 100);
    console.log(`Class: "${className}", Type: "${type}", Text: "${text}"`);
    console.log('HTML snippet:\n', $(el).html()?.substring(0, 400));
    console.log('------------------------------\n');
  });
}

main().catch(console.error);
