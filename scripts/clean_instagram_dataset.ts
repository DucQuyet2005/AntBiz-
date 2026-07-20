import * as fs from 'fs';
import * as path from 'path';

const datasetPath = path.join(process.cwd(), 'scripts', 'dataset_instagram_vietcetera.jsonl');
const backupPath = path.join(process.cwd(), 'scripts', 'dataset_instagram_preclean_backup.jsonl');

interface DialogueData {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}

function cleanInstagramText(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // 1. Xóa các đoạn CTA dẫn link lơ lửng (ví dụ: "đọc thêm tại", "bài viết đầy đủ trên", "tại link ở bio")
  // Regex này quét các từ chỉ hành động dẫn link đứng trước cuối câu hoặc đứng trước danh sách các hashtag ở cuối bài.
  const ctaRegex = /\b(?:đọc|xem|tìm\s+hiểu|đón\s+xem|tham\s+khảo)?\s*(?:thêm|ngay|chi\s+tiết|đầy\s+đủ|full)?\s*(?:bài\s+viết|hình\s+ảnh|JD|thông\s+tin|video)?\s*(?:tại|trên|qua|ở|dưới|trong|link|bio|đường\s+link)\s*(?=\s*(?:\#[a-zA-Z0-9_]+\s*)*$)/gi;
  cleaned = cleaned.replace(ctaRegex, '');

  // 2. Làm sạch các dấu câu thừa thãi bị trơ trọi (như dấu hai chấm ":", dấu gạch ngang "-") sau khi xóa từ dẫn link
  // Ví dụ: "bàn luận xôn xao: #Vietcetera" -> "bàn luận xôn xao #Vietcetera"
  cleaned = cleaned.replace(/[\s\-\.\:\,\_]+(?=\s*(?:\#[a-zA-Z0-9_]+\s*)+$)/g, ' ');

  // 3. Xóa các dấu câu/ký tự phân cách rác ở cuối cùng nếu không có hashtag
  cleaned = cleaned.replace(/[\s\-\.\:\,\#\_\~…]+$/, '').trim();

  return cleaned;
}

async function run() {
  if (!fs.existsSync(datasetPath)) {
    console.error(`❌ Không tìm thấy file dữ liệu: ${datasetPath}`);
    return;
  }

  // Sao lưu dữ liệu
  fs.copyFileSync(datasetPath, backupPath);
  console.log(`📦 Đã sao lưu dữ liệu Instagram thô sang: ${backupPath}`);

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
      const cleanedText = cleanInstagramText(originalText);

      // Loại bỏ nếu bài viết quá ngắn (dưới 10 từ)
      const wordCount = cleanedText.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount < 10) {
        discardedCount++;
        continue;
      }

      if (originalText !== cleanedText) {
        changeCount++;
        assistantMsg.content = cleanedText;

        // Cập nhật Prompt gợi ý
        const firstTenWords = cleanedText.split(' ').slice(0, 10).join(' ') + '...';
        data.messages[1].content = `Hãy viết một bài đăng Instagram chia sẻ về chủ đề: ${firstTenWords}`;
      }

      cleanedDataset.push(JSON.stringify(data));
    } catch (err) {
      cleanedDataset.push(line);
    }
  }

  fs.writeFileSync(datasetPath, cleanedDataset.join('\n') + '\n', 'utf8');

  console.log(`\n======================================================`);
  console.log(`🎉 HOÀN THÀNH LÀM SẠCH DỮ LIỆU INSTAGRAM!`);
  console.log(`📊 Tổng số dòng xử lý: ${lines.length}`);
  console.log(`✨ Số dòng được làm sạch thành công: ${changeCount}`);
  console.log(`🗑️ Số dòng quá ngắn bị loại bỏ: ${discardedCount}`);
  console.log(`💾 File đích đã sẵn sàng: ${datasetPath}`);
  console.log(`======================================================\n`);
}

run();
