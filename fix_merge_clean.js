const fs = require('fs');

let headCode = fs.readFileSync('lib/crawler/preprocess.ts', 'utf8');
const theirsCode = fs.readFileSync('lib/crawler/preprocess_theirs.ts', 'utf8');

// 1. Interfaces
headCode = headCode.replace(
  'export interface ArticleData {',
  `export type PageType = 'ARTICLE' | 'LISTING';

export type ArticleLayout =
  | 'standard'
  | 'video'
  | 'photo'
  | 'dmagazine' // Dan Tri longform
  | 'megastory' // Tuoi Tre longform
  | 'podcast'
  | 'infographic'
  | 'tamdiem'    // Dan Tri editorial
  | 'bandoc'     // Dan Tri reader submissions
  | 'sub_publication' // cuoi.tuoitre.vn, etc.
  | 'gocnhinmoi_standard'
  | 'gocnhinmoi_spotlight';

export interface ListingItem {
  url: string;
  title: string;
}

export interface ListingData {
  type: 'LISTING';
  url: string;
  extractedUrls: ListingItem[];
  warning: string;
}

export interface ArticleData {\n  type: 'ARTICLE';`
);

// 2. Add type to preprocessFacebook return
headCode = headCode.replace(
  'return {\n    url: raw.url,',
  `return {\n    type: 'ARTICLE',\n    url: raw.url,`
);

// 3. Extract detectPageType and extractListingLinks from theirs
const detectStart = theirsCode.indexOf('export function detectPageType');
const extractStart = theirsCode.indexOf('function extractListingLinks');
const findScopeStart = theirsCode.indexOf('function findArticleScope');

const detectCode = theirsCode.substring(detectStart, extractStart);
const extractCode = theirsCode.substring(extractStart, findScopeStart);

// Inject before preprocessFacebook
headCode = headCode.replace(
  'function seenBoilerplate',
  detectCode + '\n' + extractCode + '\nfunction seenBoilerplate'
);

// 4. Update preprocessArticle signature
headCode = headCode.replace(
  'export function preprocessArticle(raw: CrawlResult): ArticleData {',
  'export function preprocessArticle(raw: CrawlResult): ArticleData | ListingData {'
);

// 5. Inject LISTING logic inside preprocessArticle
const listingLogic = `
  // Detect Type & Layout
  const { type, layout } = detectPageType(raw.url, fullHtml);

  if (type === 'LISTING') {
    const extractedUrls = extractListingLinks(raw.url, $);
    console.log(\`   📂 Nhận diện trang LISTING — Trích xuất được \${extractedUrls.length} liên kết\`);
    return {
      type: 'LISTING',
      url: raw.url,
      extractedUrls,
      warning: \`Trang này là danh sách, đã trích xuất \${extractedUrls.length} liên kết con.\`,
    };
  }
`;
headCode = headCode.replace(
  'const $ = cheerio.load(fullHtml);',
  'const $ = cheerio.load(fullHtml);\n' + listingLogic
);

// 6. Add return type 'ARTICLE' at the end of preprocessArticle
headCode = headCode.replace(
  'return {\n    url: raw.url,\n    title,',
  `return {\n    type: 'ARTICLE',\n    url: raw.url,\n    title,`
);

// Now, the Goc Nhin Moi specific parsing (data-content-type)
// The user asked to add the new features from the pulled code.
// Instead of messing with my fallback block, I will inject the data-content-type block right before my fallback block!
// In HEAD, I have: `} else {` followed by `const seenTexts = new Set<string>();`
const dataContentTypeLogic = `
  // ── Goc Nhin Moi (data-content-type) ──
  const contentRoot = $('#html_content');
  if (contentRoot.length && contentRoot.find('[data-content-type]').length > 0) {
    contentRoot.find('[data-content-type]').each((_, el) => {
      const block = $(el);
      const btype = block.attr('data-content-type');

      if (btype === 'paragraph') {
        const text = cleanText(block.text());
        if (text) bodyBlocks.push({ type: 'paragraph', text });
      } else if (btype === 'heading') {
        const text = cleanText(block.text());
        const level = block.attr('data-level') || '2';
        if (text) bodyBlocks.push({ type: \`heading\${level}\` as 'heading2' | 'heading3', text });
      } else if (btype === 'image') {
        const imgUrl = block.attr('data-url') || '';
        const caption = cleanCaption(block.attr('data-caption') || block.attr('alt'));
        if (imgUrl) {
          images.push({ url: imgUrl, caption });
          bodyBlocks.push({ type: 'image', url: imgUrl, caption });
        }
      }
    });
  } else {
`;

// Find "} else if (isSpotlight) { ... }" block end in HEAD.
// It ends around:
//     spotlightFullText = textSegments.join('\n\n');
//   } else {
//     const seenTexts = new Set<string>();

const headTarget = `spotlightFullText = textSegments.join('\\n\\n');\n  } else {\n    const seenTexts`;
headCode = headCode.replace(headTarget, `spotlightFullText = textSegments.join('\\n\\n');\n  } else {\n${dataContentTypeLogic}\n    const seenTexts`);

// Close the if/else block for data-content-type before the fallback image block
const headTarget2 = `// ── Fallback image from og:image`;
headCode = headCode.replace(headTarget2, `}\n\n  // ── Fallback image from og:image`);

fs.writeFileSync('lib/crawler/preprocess.ts', headCode);
console.log('Merged carefully');
