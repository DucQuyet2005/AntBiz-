import { crawlUrl } from '../lib/crawler/index';
import { preprocessArticle, detectPageType } from '../lib/crawler/preprocess';

const urlData = {
  "dantri": {
    "standard_article": [
      "https://dantri.com.vn/cong-nghe/67-ten-mien-vn-hai-ky-tu-duoc-dau-gia-tong-gia-tri-hon-15-ty-dong-20260706181142303.htm"
    ],
    "ban_doc": [
      "https://dantri.com.vn/ban-doc/nguoi-dan-doanh-nghiep-co-duoc-quyen-tu-choi-chia-se-du-lieu-tu-camera-20260707072844419.htm"
    ],
    "event_tag": [
      "https://dantri.com.vn/event/aff-cup-2026-9633.htm"
    ],
    "tam_diem": [
      "https://dantri.com.vn/tam-diem/can-them-gi-ngoai-mien-phi-ve-xe-buyt-20260706231734884.htm"
    ],
    "video_dt360": [
      "https://dantri.com.vn/dt360/hang-tram-nghin-nguoi-tien-dua-lanh-tu-toi-cao-iran-ali-khamenei-20260707132410216.htm"
    ],
    "dmagazine": [
      "https://dantri.com.vn/dmagazine/hai-banh-toi-di-la-di-hon-20-nam-mat-me-luon-khong-kip-ve-20221027203116697.htm"
    ]
  },
  "tuoitre": {
    "standard_article": [
      "https://tuoitre.vn/chu-tich-nguyen-van-duoctphcm-huy-dong-moi-nguon-luc-de-ve-dich-tang-truong-hai-con-so-100260708085145768.htm"
    ],
    "event_tag": [
      "https://tuoitre.vn/5-nam-thanh-pho-mang-ten-bac-e2047.htm"
    ],
    "author_page": [
      "https://tuoitre.vn/tac-gia/huynh-van-son-51602.htm"
    ],
    "video": [
      "https://tuoitre.vn/video/huong-dan-thu-tuc-chuyen-truong-cho-con-theo-quy-dinh-moi-nhat-2026-200513.htm"
    ],
    "podcast": [
      "https://podcast.tuoitre.vn/chu-de/chuyen-gia-dinh-9.htm"
    ],
    "english_edition": [
      "https://news.tuoitre.vn/hanoi-apartment-market-cools-after-prolonged-price-surge-103260707161936716.htm"
    ],
    "tuoitre_cuoi": [
      "https://cuoi.tuoitre.vn/hai-thanh-nien-bong-dung-bi-diem-huyet-mat-ket-noi-giua-duong-100260707141859128.htm"
    ],
    "tuoitre_cuoituan": [
      "https://cuoituan.tuoitre.vn/doc-la-mon-an-vinh-cuu-20260530114442143.htm"
    ],
    "megastory": [
      "https://tuoitre.vn/song-khoe-dang-tro-thanh-lifestyle-moi-cua-nguoi-viet-20260527154602918.htm"
    ]
  }
};

async function main() {
  for (const [site, types] of Object.entries(urlData)) {
    console.log(`\n==================================================`);
    console.log(`SITE: ${site.toUpperCase()}`);
    console.log(`==================================================`);
    for (const [typeName, urls] of Object.entries(types)) {
      for (const url of urls) {
        console.log(`\n--------------------------------------------------`);
        console.log(`Type: ${typeName} | URL: ${url}`);
        try {
          const raw = await crawlUrl(url);
          const { type: detectedType, layout: detectedLayout } = detectPageType(url, raw.fullPageHtml || raw.contentHtml || '');
          console.log(`Detected Type: ${detectedType} | Detected Layout: ${detectedLayout}`);
          
          const res = preprocessArticle(raw);
          if (res.type === 'LISTING') {
            console.log(`Result Type: LISTING`);
            console.log(`Extracted URLs Count: ${res.extractedUrls.length}`);
            console.log(`Sample child URLs:`, res.extractedUrls.slice(0, 3));
          } else {
            console.log(`Result Type: ARTICLE`);
            console.log(`Title: "${res.title}"`);
            console.log(`Author: "${res.author}"`);
            console.log(`Published Date: "${res.published_at}"`);
            console.log(`Category: "${res.category}"`);
            console.log(`Body blocks count: ${res.body.length}`);
            console.log(`Images count: ${res.images.length}`);
            console.log(`Description length: ${res.description?.length || 0}`);
            console.log(`Full text length: ${res.full_text?.length || 0}`);
            
            // Print brief structure of body blocks
            const blocksSummary = res.body.slice(0, 5).map(b => `[${b.type}] ${b.text ? b.text.slice(0, 50) + '...' : b.url}`);
            console.log(`First few body blocks:`, blocksSummary);
          }
        } catch (err: any) {
          console.error(`Error processing ${url}:`, err.message || err);
        }
      }
    }
  }
}

main().catch(console.error);
