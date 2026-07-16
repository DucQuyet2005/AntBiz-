import * as fs from 'fs';
import * as path from 'path';

const SCRIPTS_DIR = path.join(process.cwd(), 'scripts');
const filesToMerge = [
  'dataset_vietcetera.jsonl',
  'dataset_threads.jsonl',
  'dataset_instagram_vietcetera.jsonl'
];
const outputPath = path.join(SCRIPTS_DIR, 'dataset_social_all.jsonl');

async function run() {
  console.log('🔄 Bắt đầu gộp các tệp dữ liệu mạng xã hội...');
  const writeStream = fs.createWriteStream(outputPath, { flags: 'w', encoding: 'utf8' });
  let totalLines = 0;

  for (const filename of filesToMerge) {
    const filePath = path.join(SCRIPTS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Bỏ qua tệp không tồn tại: ${filename}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      writeStream.write(line + '\n');
    }
    
    console.log(`   ✅ Đã gộp ${lines.length} dòng từ: ${filename}`);
    totalLines += lines.length;
  }

  writeStream.end();
  console.log(`\n======================================================`);
  console.log(`🎉 GỘP THÀNH CÔNG THÀNH TỆP ĐA NĂNG!`);
  console.log(`📂 Tệp kết quả: ${outputPath}`);
  console.log(`📊 Tổng số dòng bài viết: ${totalLines}`);
  console.log(`======================================================\n`);
}

run();
