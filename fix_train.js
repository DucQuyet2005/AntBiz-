const fs = require('fs');
let tr = fs.readFileSync('app/api/author-profiles/[id]/train/route.ts', 'utf8');

// There are multiple places
tr = tr.replace(/const crawlerData = preprocessArticle\(crawlResult\);/g, `const crawlerData = preprocessArticle(crawlResult);\n    if (crawlerData.type === 'LISTING') {\n      return NextResponse.json({ error: 'Cannot train on listing pages' }, { status: 400 });\n    }`);

fs.writeFileSync('app/api/author-profiles/[id]/train/route.ts', tr);
console.log('Fixed train');

let sc = fs.readFileSync('app/api/scrape/route.ts', 'utf8');
sc = sc.replace(/if \(!crawlerData\)/g, `if (crawlerData.type === 'LISTING') {\n      return NextResponse.json({\n        success: true,\n        data: {\n          type: 'LISTING',\n          url: crawlerData.url,\n          extractedUrls: crawlerData.extractedUrls,\n          warning: crawlerData.warning\n        }\n      });\n    }\n    if (!crawlerData)`);
fs.writeFileSync('app/api/scrape/route.ts', sc);
console.log('Fixed scrape');
