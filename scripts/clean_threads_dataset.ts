import * as fs from 'fs';
import * as path from 'path';

const datasetPath = path.join(process.cwd(), 'scripts', 'dataset_threads.jsonl');
const backupPath = path.join(process.cwd(), 'scripts', 'dataset_threads_preclean_backup.jsonl');

interface DialogueData {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}

function cleanThreadsText(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // 1. Xóa chữ "Translate" và các chỉ số trang đi kèm (ví dụ: "Translate 1/2", "Translate 2/2", "Translate")
  cleaned = cleaned.replace(/\s*Translate\s*(\d+\/\d+)?/gi, '');

  // 2. Xóa các số phân trang độc lập ở cuối câu (ví dụ: " 1/2", " 2/2")
  cleaned = cleaned.replace(/\s*\d+\/\d+\s*$/gi, '');

  // 3. Xóa các URL không có http/https nhưng có domain và kết thúc bằng dấu ba chấm hoặc text (ví dụ: kenh14.vn/khuoc… hoặc kenh14.vn/abc)
  cleaned = cleaned.replace(/\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}\/[^\s]*…?/gi, '');
  cleaned = cleaned.replace(/\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}\/[^\s]*/gi, '');

  // 4. Xóa dấu hai chấm, dấu gạch ngang hoặc khoảng trắng dư thừa bị trơ trọi ở cuối câu sau khi xóa link
  cleaned = cleaned.replace(/[\s\-\.\:\,\#\_\~…]+$/, '').trim();

  return cleaned;
}

async function run() {
  if (!fs.existsSync(datasetPath)) {
    console.error(`❌ Không tìm thấy file dữ liệu: ${datasetPath}`);
    return;
  }

  // Tạo file backup trước khi xử lý
  fs.copyFileSync(datasetPath, backupPath);
  console.log(`📦 Đã sao lưu dữ liệu thô sang: ${backupPath}`);

  const lines = fs.readFileSync(datasetPath, 'utf8').split('\n').filter(l => l.trim());
  const cleanedDataset: string[] = [];
  let changeCount = 0;
  let discardedCount = 0;

  for (const line of lines) {
    try {
      const data: DialogueData = JSON.parse(line);
      if (!data.messages || data.messages.length < 3) {
        discardedCount++;
        continue;
      }

      const assistantMsg = data.messages[2];
      const originalText = assistantMsg.content;
      const cleanedText = cleanThreadsText(originalText);

      // Lọc bỏ bài viết quá ngắn sau khi làm sạch (dưới 10 từ)
      const wordCount = cleanedText.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount < 10) {
        discardedCount++;
        console.log(`🗑️ Bỏ qua bài đăng quá ngắn sau làm sạch: "${cleanedText}"`);
        continue;
      }

      if (originalText !== cleanedText) {
        changeCount++;
        assistantMsg.content = cleanedText;
        
        // Cập nhật lại cả Prompt gợi ý ở User Message cho khớp với nội dung đã được làm sạch
        const firstTenWords = cleanedText.split(' ').slice(0, 10).join(' ') + '...';
        data.messages[1].content = `Hãy viết một bài đăng Threads chia sẻ về chủ đề: ${firstTenWords}`;
      }

      cleanedDataset.push(JSON.stringify(data));
    } catch (err) {
      cleanedDataset.push(line);
    }
  }

  fs.writeFileSync(datasetPath, cleanedDataset.join('\n') + '\n', 'utf8');

  console.log(`\n======================================================`);
  console.log(`🎉 HOÀN THÀNH LÀM SẠCH DỮ LIỆU!`);
  console.log(`📊 Tổng số dòng xử lý: ${lines.length}`);
  console.log(`✨ Số dòng được làm sạch thành công: ${changeCount}`);
  console.log(`🗑️ Số dòng rác bị loại bỏ: ${discardedCount}`);
  console.log(`💾 File đích đã sẵn sàng: ${datasetPath}`);
  console.log(`======================================================\n`);
}

run();
