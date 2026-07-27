import * as fs from 'fs';
import * as path from 'path';

const SCRIPTS_DIR = path.join(process.cwd(), 'scripts');

// Tất cả các tệp dữ liệu trong dự án
const filesToMerge = [
  'dataset_vietcetera.jsonl',
  'dataset_threads.jsonl',
  'dataset_instagram_vietcetera.jsonl',
  'dataset_tuananhfinpeace.jsonl',
  'dataset_vnexpress.jsonl',
  'dataset.json',
  'dataset(1).json',
  'fb_dataset.json'
];

const outputPath = path.join(SCRIPTS_DIR, 'dataset_mega_all.jsonl');

interface DialogueData {
  messages: Array<{
    role: string;
    content: string;
  }>;
}

async function run() {
  console.log('🔄 Bắt đầu tiến trình gộp CỰC ĐẠI tất cả các bộ dữ liệu...');
  const writeStream = fs.createWriteStream(outputPath, { flags: 'w', encoding: 'utf8' });
  let totalLines = 0;

  for (const filename of filesToMerge) {
    const filePath = path.join(SCRIPTS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Bỏ qua tệp không tồn tại: ${filename}`);
      continue;
    }

    try {
      const ext = path.extname(filename);
      let linesAdded = 0;

      if (ext === '.jsonl') {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        for (const line of lines) {
          // Đảm bảo đúng định dạng JSON hợp lệ chứa messages
          const item = JSON.parse(line);
          if (item.messages) {
            writeStream.write(JSON.stringify({ messages: item.messages }) + '\n');
            linesAdded++;
          }
        }
      } else if (ext === '.json') {
        // Xử lý tệp JSON dạng Array thông thường
        const content = fs.readFileSync(filePath, 'utf8');
        const items = JSON.parse(content);
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.messages) {
              writeStream.write(JSON.stringify({ messages: item.messages }) + '\n');
              linesAdded++;
            }
          }
        }
      }

      console.log(`   ✅ Đã gộp thành công ${linesAdded} dòng từ: ${filename}`);
      totalLines += linesAdded;
    } catch (err: any) {
      console.log(`   ❌ Lỗi khi đọc tệp ${filename}: ${err.message}`);
    }
  }

  writeStream.end();
  console.log(`\n======================================================`);
  console.log(`🎉 HOÀN THÀNH GỘP CỰC ĐẠI!`);
  console.log(`📂 Tệp kết quả: ${outputPath}`);
  console.log(`📊 Tổng số dòng bài viết: ${totalLines}`);
  console.log(`======================================================\n`);
}

run();
