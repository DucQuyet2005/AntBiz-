const fs = require('fs');

const headCode = fs.readFileSync('lib/crawler/preprocess.ts', 'utf8');
const theirsCode = fs.readFileSync('lib/crawler/preprocess_theirs.ts', 'utf8');

let newCode = headCode;

// 1. Interfaces
newCode = newCode.replace(
  'export interface ArticleData {',
  `export interface ArticleData {\n  type: 'ARTICLE';`
);

const listingInterfaces = `
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
`;
newCode = newCode.replace('export interface ArticleData {', listingInterfaces + '\nexport interface ArticleData {');

// 2. Add type to preprocessFacebook return
newCode = newCode.replace(
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
newCode = newCode.replace(
  'function seenBoilerplate',
  detectCode + '\n' + extractCode + '\nfunction seenBoilerplate'
);

// 4. Update preprocessArticle signature
newCode = newCode.replace(
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
newCode = newCode.replace(
  'const $ = cheerio.load(fullHtml);',
  'const $ = cheerio.load(fullHtml);\n' + listingLogic
);

// 6. Add return type 'ARTICLE' at the end of preprocessArticle
newCode = newCode.replace(
  'return {\n    url: raw.url,\n    title,',
  `return {\n    type: 'ARTICLE',\n    url: raw.url,\n    title,`
);

// 7. Inject data-content-type parsing logic before generic fallback
const dataContentTypeLogic = `
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

newCode = newCode.replace(
  `} else if (isSpotlight) {`,
  `} else if (isSpotlight) {`
); // Anchor
// Let's replace the else block logic of HEAD
const genericStart = newCode.indexOf("scope.find('p, h2, h3, img, div.content-body, div.article-body, div.post-content').each");
if (genericStart > -1) {
  newCode = newCode.slice(0, genericStart) + dataContentTypeLogic + newCode.slice(genericStart);
  
  // Need to close the else block
  const returnObjIndex = newCode.indexOf('// ── Fallback image from og:image if no body images found ─────────────');
  newCode = newCode.slice(0, returnObjIndex) + '    }\n\n  ' + newCode.slice(returnObjIndex);
}

fs.writeFileSync('lib/crawler/preprocess_merged.ts', newCode);
console.log('Done!');
