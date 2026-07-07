const fs = require('fs');
let content = fs.readFileSync('lib/crawler/preprocess.ts', 'utf8');

const missingTypes = `
export type PageType = 'ARTICLE' | 'LISTING';

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
`;

content = content.replace('export interface ListingItem', missingTypes + '\nexport interface ListingItem');

content = content.replace(
  '  return {\n    url: raw.url,\n    title,',
  `  return {\n    type: 'ARTICLE',\n    url: raw.url,\n    title,`
);

content = content.replace(
  '  return {\n    url: raw.url,\n    title: title,',
  `  return {\n    type: 'ARTICLE',\n    url: raw.url,\n    title: title,`
);

fs.writeFileSync('lib/crawler/preprocess.ts', content, 'utf8');
console.log('Fixed preprocess.ts types and returns');

let trainRoute = fs.readFileSync('app/api/author-profiles/[id]/train/route.ts', 'utf8');
trainRoute = trainRoute.replace(/const rawText = crawlerData\.full_text \|\| crawlerData\.description \|\| '';/g, 
  "const rawText = crawlerData.type === 'ARTICLE' ? (crawlerData.full_text || crawlerData.description || '') : '';");
fs.writeFileSync('app/api/author-profiles/[id]/train/route.ts', trainRoute, 'utf8');
console.log('Fixed train/route.ts');
