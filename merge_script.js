const fs = require('fs');
let content = fs.readFileSync('lib/crawler/preprocess.ts', 'utf8');

const blocks = content.split('<<<<<<< HEAD\n');

let newContent = blocks[0];

for (let i = 1; i < blocks.length; i++) {
  const block = blocks[i];
  const headEndIdx = block.indexOf('=======\n');
  const headPart = block.substring(0, headEndIdx);
  
  const rest = block.substring(headEndIdx + 8);
  const pulledEndIdx = rest.indexOf('>>>>>>> ');
  const newlineAfterPulled = rest.indexOf('\n', pulledEndIdx);
  
  const pulledPart = rest.substring(0, pulledEndIdx);
  const tail = rest.substring(newlineAfterPulled + 1);
  
  // Custom logic for each conflict
  if (i === 1) {
    // Conflict 1: HEAD has preprocessFacebook and start of preprocessArticle. PULLED has detectPageType, extractListingLinks, and start of preprocessArticle.
    // We want preprocessFacebook + detectPageType + extractListingLinks + combined preprocessArticle.
    // headPart contains seenBoilerplate, preprocessFacebook, and export function preprocessArticle(raw: CrawlResult): ArticleData { ...
    // pulledPart contains detectPageType, extractListingLinks, findArticleScope, export function preprocessArticle(raw: CrawlResult): ArticleData | ListingData { ...
    
    const headFuncs = headPart.substring(0, headPart.indexOf('export function preprocessArticle'));
    const pulledFuncs = pulledPart.substring(0, pulledPart.indexOf('export function preprocessArticle'));
    
    const combined = `${headFuncs}
${pulledFuncs}
export function preprocessArticle(raw: CrawlResult): ArticleData | ListingData {
  const url = raw.url || '';
  if (url.includes('facebook.com') || url.includes('fbcdn') || url.includes('fb.com') || url.includes('fb.watch')) {
    return preprocessFacebook(raw);
  }

  console.log(\`\\n🔧 [Preprocess] Đang tiền xử lý dữ liệu cho: \${raw.url}\`);
`;
    newContent += combined + tail;
  } else if (i === 2) {
    // Conflict 2: HEAD has isSpotlight logic. PULLED is empty. Keep HEAD.
    newContent += headPart + tail;
  } else if (i === 3) {
    // Conflict 3: HEAD has isSpotlight parsing logic. PULLED has closing brackets for isDantri/isTuoitre.
    // HEAD has `} }); } else if (isSpotlight) { ... }`
    // PULLED has `} }); }`
    newContent += headPart + tail;
  } else if (i === 4) {
    // Conflict 4: HEAD has fallback parsing logic with tagRegex. PULLED has Goc Nhin Moi `data-content-type` parsing logic.
    // Actually, PULLED already has `if (contentRoot.length) { contentRoot.find('[data-content-type]').each... } else { fallback }`
    // So if we just use PULLED, we get the data-content-type logic. BUT we want to inject HEAD's advanced fallback into the `else` branch of PULLED.
    // It's easier to just use PULLED for this block (which handles data-content-type), and we'll manually patch the else block later if needed.
    // Wait! Conflict 4 is ONLY inside the `contentRoot.length` if-block (the data-content-type mapping)!
    // Let's just use PULLED here, because HEAD completely deleted the data-content-type block.
    // BUT we need to make sure the brackets match!
    // HEAD part:
    // scope.find('p, h2, h3...').each...
    // PULLED part:
    // if (btype === 'paragraph') { ... }
    
    // So the PULLED part is actually the inside of `contentRoot.find('[data-content-type]').each`.
    // If we take PULLED, we restore the `data-content-type` parser.
    newContent += pulledPart + tail;
  }
}

// Write the result back
fs.writeFileSync('lib/crawler/preprocess.ts', newContent, 'utf8');
console.log('Merged successfully!');
