import * as fs from 'fs';
import * as path from 'path';

const SCRIPTS_DIR = path.join(process.cwd(), 'scripts');

// Liên từ/giới từ/từ dẫn link cần xóa nếu đứng cuối bài hoặc ngay trước danh sách hashtags ở cuối bài
const CTA_WORDS = [
  'tại', 'trên', 'qua', 'ở', 'dưới', 'trong', 'link', 'bio', 'đường link',
  'bài viết', 'hình ảnh', 'JD', 'full', 'đọc', 'xem', 'tìm hiểu', 'đón xem', 'tham khảo', 'đầy đủ'
];

const CTA_REGEX = new RegExp(
  `\\b(?:đọc|xem|tìm\\s+hiểu|đón\\s+xem|tham\\s+khảo)?\\s*(?:thêm|ngay|chi\\s+tiết|đầy\\s+đủ|full)?\\s*(?:bài\\s+viết|hình\\s+ảnh|JD|thông\\s+tin|video)?\\s*(?:${CTA_WORDS.join('|')})\\s*(?=\\s*(?:\\#[a-zA-Z0-9_]+\\s*)*$)`,
  'gi'
);

interface DialogueData {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}

function cleanContentText(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // 1. Xóa rác giao diện Facebook/Threads/Instagram
  cleaned = cleaned.replace(/\s*Translate\s*(\d+\/\d+)?/gi, '');
  cleaned = cleaned.replace(/\s*(Xem\s+thêm|See\s+more|Ẩn\s+bớt|See\s+less|Xem\s+bản\s+dịch)\s*$/gi, '');

  // 2. Xóa chỉ số phân trang ở cuối câu (ví dụ: " 1/2", " 2/2")
  cleaned = cleaned.replace(/\s*\d+\/\d+\s*$/gi, '');

  // 3. Xóa các URL có tiền tố http/https
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, '');

  // 4. Xóa các URL vỡ hoặc không có tiền tố (ví dụ: kenh14.vn/ca-mx… hoặc vnexpress.net/abc)
  cleaned = cleaned.replace(/\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}\/[^\s]*…?/gi, '');
  cleaned = cleaned.replace(/\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}\/[^\s]*/gi, '');

  // 5. Áp dụng regex xóa các từ chỉ dẫn link lơ lửng ở cuối bài hoặc trước hashtag
  cleaned = cleaned.replace(CTA_REGEX, '');

  // 6. Xóa các ký tự phân cách bị trơ trọi trước hashtag (ví dụ: "xôn xao: #Vietcetera" -> "xôn xao #Vietcetera")
  cleaned = cleaned.replace(/[\s\-\.\:\,\_]+(?=\s*(?:\#[a-zA-Z0-9_]+\s*)+$)/g, ' ');

  // 7. Chuẩn hóa khoảng trắng và dấu ngắt dòng
  cleaned = cleaned.replace(/\r?\n/g, '\n').replace(/ {2,}/g, ' ').trim();

  // 8. Xóa các ký tự phân cách thừa ở cuối cùng (nếu không có hashtag)
  cleaned = cleaned.replace(/[\s\-\.\:\,\#\_\~…]+$/, '').trim();

  return cleaned;
}

async function cleanFile(filePath: string) {
  const filename = path.basename(filePath);
  console.log(`\n------------------------------------------------------`);
  console.log(`📁 Bắt đầu xử lý file: ${filename}`);
  console.log(`------------------------------------------------------`);

  // Tạo file backup trước khi ghi đè
  const backupPath = filePath + '.preclean_bak';
  fs.copyFileSync(filePath, backupPath);

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n').filter(l => l.trim());
  const cleanedDataset: string[] = [];
  const seenTexts = new Set<string>();

  let changeCount = 0;
  let duplicateCount = 0;
  let discardedCount = 0;

  for (const line of lines) {
    try {
      const data: DialogueData = JSON.parse(line);
      if (!data.messages || data.messages.length < 3) {
        discardedCount++;
        continue;
      }

      const systemMsg = data.messages[0];
      const userMsg = data.messages[1];
      const assistantMsg = data.messages[2];

      const originalText = assistantMsg.content;
      const cleanedText = cleanContentText(originalText);

      // Loại bỏ bài viết quá ngắn sau khi làm sạch (dưới 10 từ)
      const wordCount = cleanedText.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount < 10) {
        discardedCount++;
        continue;
      }

      // Loại bỏ trùng lặp trong cùng 1 file
      if (seenTexts.has(cleanedText)) {
        duplicateCount++;
        continue;
      }
      seenTexts.add(cleanedText);

      if (originalText !== cleanedText) {
        changeCount++;
        assistantMsg.content = cleanedText;

        // Cập nhật lại câu hỏi gợi ý của User để khớp với text sau làm sạch
        const firstTenWords = cleanedText.split(' ').slice(0, 10).join(' ') + '...';
        
        // Nhận diện kiểu nền tảng từ nội dung prompt cũ để giữ nguyên cấu trúc ngữ cảnh
        let platformName = 'bài đăng';
        if (userMsg.content.includes('Facebook')) platformName = 'bài đăng Facebook';
        else if (userMsg.content.includes('Threads')) platformName = 'bài đăng Threads';
        else if (userMsg.content.includes('Instagram')) platformName = 'bài đăng Instagram';

        userMsg.content = `Hãy viết một ${platformName} chia sẻ về chủ đề: ${firstTenWords}`;
      }

      cleanedDataset.push(JSON.stringify(data));
    } catch (err) {
      cleanedDataset.push(line);
    }
  }

  // Ghi tệp đã làm sạch
  fs.writeFileSync(filePath, cleanedDataset.join('\n') + '\n', 'utf8');

  console.log(`📊 Kết quả cọ rửa cho [${filename}]:`);
  console.log(`   - Tổng số dòng gốc: ${lines.length}`);
  console.log(`   - Số bài viết được làm sạch: ${changeCount}`);
  console.log(`   - Số bài trùng lặp đã loại bỏ: ${duplicateCount}`);
  console.log(`   - Số bài rác/quá ngắn đã xóa: ${discardedCount}`);
  console.log(`   - Tổng số bài sạch còn lại: ${cleanedDataset.length}`);
}

async function run() {
  if (!fs.existsSync(SCRIPTS_DIR)) {
    console.error(`❌ Thư mục scripts không tồn tại: ${SCRIPTS_DIR}`);
    return;
  }

  const files = fs.readdirSync(SCRIPTS_DIR);
  // Chỉ lọc các tệp dataset .jsonl thực tế, bỏ qua các tệp backup
  const jsonlFiles = files.filter(file => {
    return file.endsWith('.jsonl') && 
           !file.endsWith('.preclean_bak') && 
           !file.endsWith('_backup.jsonl');
  });

  console.log(`🚀 Tìm thấy ${jsonlFiles.length} file .jsonl cần làm sạch.`);

  for (const file of jsonlFiles) {
    const fullPath = path.join(SCRIPTS_DIR, file);
    await cleanFile(fullPath);
  }

  console.log(`\n======================================================`);
  console.log(`✨ TẤT CẢ CÁC BỘ DỮ LIỆU ĐÃ ĐƯỢC LÀM SẠCH HOÀN HẢO!`);
  console.log(`======================================================\n`);
}

run().catch(err => console.error('💥 Lỗi:', err));
