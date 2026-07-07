const fs = require('fs');
let content = fs.readFileSync('lib/crawler/preprocess.ts', 'utf8');

content = content.replace(
  'return {\n    url: raw.url,\n    title,',
  `return {\n    type: 'ARTICLE',\n    url: raw.url,\n    title,`
);
content = content.replace(
  'return {\n    url: raw.url,\n    title: title,',
  `return {\n    type: 'ARTICLE',\n    url: raw.url,\n    title: title,`
);
fs.writeFileSync('lib/crawler/preprocess.ts', content);

let tr = fs.readFileSync('app/api/author-profiles/[id]/train/route.ts', 'utf8');
tr = tr.replace(/crawlerData\.full_text/g, '(crawlerData as any).full_text').replace(/crawlerData\.description/g, '(crawlerData as any).description');
fs.writeFileSync('app/api/author-profiles/[id]/train/route.ts', tr);
console.log('Fixed');
