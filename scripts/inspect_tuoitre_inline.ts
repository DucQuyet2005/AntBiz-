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
  
  // Let's find elements containing "rạch Xuyên Tâm" or "Mặt bằng sẵn sàng"
  $(':contains("Mặt bằng sẵn sàng")').each((_, el) => {
    const tagName = el.tagName || (el as any).name;
    const className = $(el).attr('class') || '';
    const id = $(el).attr('id') || '';
    console.log(`Tag: ${tagName}, Class: "${className}", Id: "${id}"`);
    // Print parents
    let parent = $(el).parent();
    let depth = 0;
    while (parent.length && depth < 4) {
      console.log(`  Parent Tag: ${parent.prop('tagName')}, Class: "${parent.attr('class') || ''}", Id: "${parent.attr('id') || ''}"`);
      parent = parent.parent();
      depth++;
    }
  });
}

main().catch(console.error);
