import * as fs from 'fs';
import * as path from 'path';

const SCRIPTS_DIR = path.join(process.cwd(), 'scripts');
const inputPath = path.join(SCRIPTS_DIR, 'dataset_social_all.jsonl');
const outputPath = path.join(SCRIPTS_DIR, 'dataset_social_generic.jsonl');

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DialogueData {
  messages: Message[];
}

// Các cụm từ quảng cáo, thương hiệu cần loại bỏ hoặc làm sạch ở bất kỳ vị trí nào
const AD_SENTENCE_PATTERNS = [
  /xem (phiên bản)? đầy đủ/i,
  /đón xem/i,
  /phát sóng/i,
  /heineken/i,
  /prudential/i,
  /van lang/i,
  /he dinh duong/i,
  /hiring/i,
  /tuyển dụng/i,
  /nhấn vào link/i,
  /truy cập đường link/i,
  /click vào/i,
  /đường link ở bio/i,
  /link sinh học/i,
  /have a sip/i,
  /edustation/i,
  /kháng thương/i,
  /vietcetera podcast/i,
  /vietcetera\.com/i,
  /spotify/i,
  /apple podcast/i,
  /youtube/i,
  /fanstation/i
];

// Các từ khóa chỉ định câu kêu gọi hành động dẫn link (CTA) ở cuối bài viết
const CTA_LAST_SENTENCE_PATTERNS = [
  /dưới đây/i,
  /tham khảo/i,
  /tác giả/i,
  /chấp bút/i,
  /chắp bút/i,
  /đọc thêm/i,
  /xem thêm/i,
  /tại đây/i,
  /link/i,
  /website/i,
  /bài viết/i,
  /chuyển bản dịch/i
];

function cleanAssistantContent(text: string): string {
  if (!text) return '';

  // 1. Chia văn bản thành các dòng
  const lines = text.split('\n');
  const cleanedLines: string[] = [];

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l].trim();
    if (!line) continue;

    // Tách dòng thành các câu bằng dấu chấm, chấm hỏi, chấm than
    const sentences = line.split(/(?<=[.!?])\s+/);
    
    // Nếu đây là dòng cuối cùng của bài viết
    if (l === lines.length - 1 && sentences.length > 0) {
      // Kiểm tra câu cuối cùng của bài viết xem có phải là câu CTA dắt link không
      const lastSentenceIdx = sentences.length - 1;
      const lastSentence = sentences[lastSentenceIdx];
      
      let isCTA = false;
      for (const pattern of CTA_LAST_SENTENCE_PATTERNS) {
        if (pattern.test(lastSentence)) {
          isCTA = true;
          break;
        }
      }
      
      if (isCTA) {
        // Cắt bỏ câu kêu gọi hành động dắt link ở cuối bài viết
        sentences.splice(lastSentenceIdx, 1);
      }
    }

    const cleanedSentences = sentences.filter(sentence => {
      // Loại bỏ các câu chứa các mẫu quảng cáo ở bất kỳ đâu
      for (const pattern of AD_SENTENCE_PATTERNS) {
        if (pattern.test(sentence)) {
          return false;
        }
      }
      return true;
    });

    if (cleanedSentences.length > 0) {
      cleanedLines.push(cleanedSentences.join(' '));
    }
  }

  let cleanedText = cleanedLines.join('\n');

  // 2. Thay thế thương hiệu "Vietcetera" thành placeholder "{brand_name}"
  cleanedText = cleanedText.replace(/Vietcetera/g, '{brand_name}');
  cleanedText = cleanedText.replace(/vietcetera/g, '{brand_name}');

  // 3. Chuẩn hóa khoảng trắng và các dấu chấm thừa
  cleanedText = cleanedText.replace(/ {2,}/g, ' ').trim();
  cleanedText = cleanedText.replace(/[\s\-\.\:\,\#\_\~…]+$/, '').trim(); // Xóa rác cuối bài

  return cleanedText;
}

function cleanSystemContent(text: string): string {
  if (!text) return '';
  return text.replace(/Vietcetera/gi, '{brand_name}');
}

async function run() {
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Không tìm thấy file nguồn: ${inputPath}`);
    return;
  }

  console.log(`🔄 Bắt đầu tiến trình "Khử thương hiệu & CTA dắt link" cho dataset...`);
  const lines = fs.readFileSync(inputPath, 'utf8').split('\n').filter(l => l.trim());
  const debrandedDataset: string[] = [];

  let totalCleanedCount = 0;
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

      const originalAssistant = assistantMsg.content;
      const cleanedAssistant = cleanAssistantContent(originalAssistant);
      const cleanedSystem = cleanSystemContent(systemMsg.content);

      // Loại bỏ các bài viết quá ngắn sau khi lọc bỏ quảng cáo & CTA
      const wordCount = cleanedAssistant.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount < 10) {
        discardedCount++;
        continue;
      }

      systemMsg.content = cleanedSystem;
      assistantMsg.content = cleanedAssistant;

      // Cập nhật lại câu hỏi gợi ý của User để khớp với text sau làm sạch
      let cleanedUserPrompt = userMsg.content;
      cleanedUserPrompt = cleanedUserPrompt.replace(/Vietcetera/gi, '{brand_name}');
      
      const promptParts = cleanedUserPrompt.split('chia sẻ về chủ đề:');
      if (promptParts.length > 1) {
        const prefix = promptParts[0].trim();
        const firstTenWords = cleanedAssistant.split(' ').slice(0, 10).join(' ') + '...';
        userMsg.content = `${prefix} chia sẻ về chủ đề: ${firstTenWords}`;
      } else {
        userMsg.content = cleanedUserPrompt;
      }

      debrandedDataset.push(JSON.stringify(data));
      totalCleanedCount++;
    } catch (err: any) {
      console.log(`❌ Lỗi dòng: ${err.message}`);
    }
  }

  fs.writeFileSync(outputPath, debrandedDataset.join('\n') + '\n', 'utf8');

  console.log(`\n======================================================`);
  console.log(`🎉 HOÀN THÀNH KHỬ THƯƠNG HIỆU & CTA DẮT LINK!`);
  console.log(`📂 File kết quả: ${outputPath}`);
  console.log(`📊 Tổng số dòng sạch đầu ra: ${totalCleanedCount}`);
  console.log(`🗑️ Đã loại bỏ ${discardedCount} dòng quá ngắn hoặc rác.`);
  console.log('======================================================\n');
}

run().catch(err => console.error('💥 Lỗi:', err));
