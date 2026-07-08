import { crawlUrl } from '../lib/crawler/index';
import * as cheerio from 'cheerio';

const inspectUrls = [
  'https://dantri.com.vn/dt360/hang-tram-nghin-nguoi-tien-dua-lanh-tu-toi-cao-iran-ali-khamenei-20260707132410216.htm',
  'https://dantri.com.vn/tam-diem/can-them-gi-ngoai-mien-phi-ve-xe-buyt-20260706231734884.htm',
  'https://dantri.com.vn/dmagazine/hai-banh-toi-di-la-di-hon-20-nam-mat-me-luon-khong-kip-ve-20221027203116697.htm',
  'https://tuoitre.vn/song-khoe-dang-tro-thanh-lifestyle-moi-cua-nguoi-viet-20260527154602918.htm'
];

async function main() {
  for (const url of inspectUrls) {
    console.log(`\n==================================================`);
    console.log(`INSPECTING: ${url}`);
    console.log(`==================================================`);
    try {
      const raw = await crawlUrl(url);
      const html = raw.fullPageHtml || raw.contentHtml || '';
      const $ = cheerio.load(html);

      // Check author/date tags
      console.log('--- Authors / Dates / Meta ---');
      console.log('Title tag:', $('title').text().trim());
      console.log('H1:', $('h1').text().trim());
      console.log('Author elements:');
      $('.author-name, .author, .tac-gia, [itemprop="author"], .detail-author, .author-info').each((i, el) => {
        console.log(`  Selector ${$(el).attr('class') || el.name}: "${$(el).text().trim()}"`);
      });
      console.log('Date/Time elements:');
      $('.author-time, .pub-date, .date, .time, time, .detail-time, [itemprop="datePublished"]').each((i, el) => {
        console.log(`  Selector ${$(el).attr('class') || el.name}: "${$(el).text().trim()}"`);
      });

      // Show major layout wrapper tags
      console.log('--- Key Classes in DOM ---');
      const classes = new Set<string>();
      $('*').each((i, el) => {
        const cls = $(el).attr('class');
        if (cls) {
          cls.split(/\s+/).forEach(c => {
            if (c.includes('content') || c.includes('article') || c.includes('body') || c.includes('detail') || c.includes('magazine') || c.includes('spotlight') || c.includes('megastory') || c.includes('video') || c.includes('sapo')) {
              classes.add(c);
            }
          });
        }
      });
      console.log('Found layout-related classes:', Array.from(classes).slice(0, 20));

      // Check content containers
      console.log('--- Content Containers ---');
      const containers = [
        '#html_content', '.singular-content', '.detail-content', '.dmagazine-content', '.fck', 'article',
        '.video-content', '.video-detail', '.video-description', '.dt-video', '.video-player-container',
        '.megastory-content', '.megastory-body', '.longform-content', '.e-magazine'
      ];
      for (const selector of containers) {
        const els = $(selector);
        if (els.length) {
          console.log(`Container "${selector}" found: ${els.length} matches. Text length: ${$(els[0]).text().trim().length}`);
          // Print first 200 chars of text
          console.log(`  Snippet: "${$(els[0]).text().trim().slice(0, 200).replace(/\s+/g, ' ')}..."`);
        }
      }

    } catch (err: any) {
      console.error(`Error:`, err.message || err);
    }
  }
}

main().catch(console.error);
