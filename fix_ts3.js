const fs = require('fs');

let prep = fs.readFileSync('lib/crawler/preprocess.ts', 'utf8');
prep = prep.replace(
  'return {\n    url: raw.url,\n    title,',
  `return {\n    type: 'ARTICLE',\n    url: raw.url,\n    title,`
);
prep = prep.replace(
  'return {\n    url: raw.url,\n    title: title,',
  `return {\n    type: 'ARTICLE',\n    url: raw.url,\n    title: title,`
);
fs.writeFileSync('lib/crawler/preprocess.ts', prep);

let tr = fs.readFileSync('app/api/author-profiles/[id]/train/route.ts', 'utf8');
tr = tr.replace(
  'const crawlerData = preprocessArticle(crawlResult);',
  `const crawlerData = preprocessArticle(crawlResult);\n    if (crawlerData.type === 'LISTING') {\n      return NextResponse.json({ error: 'Cannot train on listing pages' }, { status: 400 });\n    }`
);
fs.writeFileSync('app/api/author-profiles/[id]/train/route.ts', tr);

console.log('Fixed');
