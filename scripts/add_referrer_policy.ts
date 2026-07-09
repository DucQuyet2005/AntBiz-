import fs from 'fs';
import path from 'path';

const filesToUpdate = [
  'components/views/AiCreatorView.tsx',
  'components/views/ArticleDetailView.tsx',
  'components/views/ArchiveView.tsx',
  'components/views/ContentCalendarView.tsx'
];

async function main() {
  for (const relPath of filesToUpdate) {
    const absPath = path.resolve('d:/AntBiz-', relPath);
    if (!fs.existsSync(absPath)) {
      console.log('Skipping missing:', relPath);
      continue;
    }
    let content = fs.readFileSync(absPath, 'utf8');
    let updated = false;
    
    // Replace <img with <img referrerPolicy="no-referrer" if not already present
    content = content.replace(/<img\s([^>]*)/g, (match, p1) => {
      if (p1.includes('referrerPolicy') || p1.includes('referrerpolicy')) {
        return match;
      }
      updated = true;
      return `<img referrerPolicy="no-referrer" ${p1}`;
    });
    
    if (updated) {
      fs.writeFileSync(absPath, content, 'utf8');
      console.log('Updated:', relPath);
    } else {
      console.log('No change needed for:', relPath);
    }
  }
}

main().catch(console.error);
