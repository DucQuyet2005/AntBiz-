import * as fs from 'fs';
import * as path from 'path';

const datasetPath = path.join(process.cwd(), 'scripts', 'dataset_threads.jsonl');
const backupPath = path.join(process.cwd(), 'scripts', 'dataset_threads_backup.jsonl');

const NEW_SYSTEM_PROMPT = "Bạn là chuyên gia sáng tạo nội dung trên mạng xã hội Threads. Văn phong của bạn hiện đại, ngắn gọn, có tính kết nối cao, mang tính tự sự và bắt kịp xu hướng của giới trẻ Việt Nam (Gen Z & Millennials).";

async function run() {
  if (!fs.existsSync(datasetPath)) {
    console.error(`❌ Không tìm thấy file: ${datasetPath}`);
    return;
  }

  console.log(`📦 Đang sao lưu file gốc sang: ${backupPath}`);
  fs.copyFileSync(datasetPath, backupPath);

  const lines = fs.readFileSync(datasetPath, 'utf8').split('\n').filter(l => l.trim());
  const updatedLines: string[] = [];

  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      if (data.messages && data.messages[0] && data.messages[0].role === 'system') {
        data.messages[0].content = NEW_SYSTEM_PROMPT;
      }
      updatedLines.push(JSON.stringify(data));
    } catch (err) {
      updatedLines.push(line);
    }
  }

  fs.writeFileSync(datasetPath, updatedLines.join('\n') + '\n', 'utf8');
  console.log(`\n✅ Đã cập nhật thành công System Prompt cho ${updatedLines.length} dòng dữ liệu trong file:`);
  console.log(`👉 ${datasetPath}`);
}

run();
