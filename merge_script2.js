const fs = require('fs');
let content = fs.readFileSync('lib/crawler/preprocess.ts', 'utf8');

// Replace all \r\n with \n for easier processing
content = content.replace(/\r\n/g, '\n');

const blocks = content.split('<<<<<<< HEAD\n');
let newContent = blocks[0];

for (let i = 1; i < blocks.length; i++) {
  const block = blocks[i];
  const headEndIdx = block.indexOf('=======\n');
  const headPart = block.substring(0, headEndIdx);
  
  const rest = block.substring(headEndIdx + 8);
  
  // Find >>>>>>> [commit hash]
  const pulledEndMatch = rest.match(/>>>>>>> [^\n]+\n/);
  const pulledEndIdx = pulledEndMatch ? pulledEndMatch.index : rest.indexOf('>>>>>>>');
  const newlineAfterPulled = pulledEndMatch ? pulledEndIdx + pulledEndMatch[0].length : rest.indexOf('\n', pulledEndIdx) + 1;
  
  const pulledPart = rest.substring(0, pulledEndIdx);
  const tail = rest.substring(newlineAfterPulled);
  
  if (i === 1) {
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
    // Keep HEAD (isSpotlight)
    newContent += headPart + tail;
  } else if (i === 3) {
    // Keep HEAD (isSpotlight closing and parse)
    newContent += headPart + tail;
  } else if (i === 4) {
    // PULLED has `data-content-type` parsing
    newContent += pulledPart + tail;
  }
}

// Convert back to \r\n if needed, but modern IDEs handle \n fine
fs.writeFileSync('lib/crawler/preprocess.ts', newContent, 'utf8');
console.log('Merged successfully 2!');
