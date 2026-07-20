import fs from 'fs';
import readline from 'readline';

const inputFilePath = './scripts/dataset_social_generic.jsonl';
const outputFilePath = './scripts/dataset_ultimate.jsonl';

const englishWords = ['leadership', 'management', 'hr', 'humanresources', 'career', 'development', 'business', 'motivation', 'threads', 'facebook', 'instagram', 'post', 'viral', 'trend', 'recruitment', 'talent', 'acquisition'];

function cleanHashtags(text: string): string {
    let cleaned = text;
    for (const en of englishWords) {
        const regex = new RegExp(`#\\w*${en}\\w*`, 'gi');
        cleaned = cleaned.replace(regex, '');
    }
    const tags = cleaned.match(/#\w+/g);
    if (tags && tags.length > 3) {
        for (let i = 3; i < tags.length; i++) {
            cleaned = cleaned.replace(tags[i], '');
        }
    }
    return cleaned.trim();
}

const rl = readline.createInterface({
  input: fs.createReadStream(inputFilePath),
  output: process.stdout,
  terminal: false
});

const outStream = fs.createWriteStream(outputFilePath);
let count = 0;
let kept = 0;

rl.on('line', (line) => {
  if (!line.trim()) return;
  const item = JSON.parse(line);
  const messages = item.messages;
  
  const userMsg = messages.find((m: any) => m.role === 'user');
  const asstMsg = messages.find((m: any) => m.role === 'assistant');
  
  if (userMsg && asstMsg) {
    count++;
    
    // 💡 GIẢI PHÁP ĐỘT PHÁ 1: Lọc sạch rác! 
    // Chỉ giữ lại những bài phân tích dài (trên 250 ký tự).
    // Bỏ hết những bài có đúng 1 dòng lặp lại tiêu đề.
    if (asstMsg.content.length < 250) {
        return; 
    }

    const match = userMsg.content.match(/Hãy viết một bài đăng (Facebook|Threads|Instagram) chia sẻ về chủ đề: (.*)/);
    if (match) {
        const platform = match[1];
        const topic = match[2];
        
        // 💡 GIẢI PHÁP ĐỘT PHÁ 2: Xóa sạch hashtag tiếng Anh khỏi não AI
        const cleanedAsst = cleanHashtags(asstMsg.content);
        
        // 💡 GIẢI PHÁP ĐỘT PHÁ 3: Kết hợp cả 2 loại Prompt!
        // Trộn 50% dùng prompt AntBiz dài, 50% dùng prompt ngắn để AI "đa năng" chấp mọi thể loại prompt
        const isAntBiz = Math.random() > 0.5;
        
        let finalUserContent = "";
        if (isAntBiz) {
            finalUserContent = `Bạn là một Content Marketer chuyên nghiệp. Hãy viết một bài đăng mạng xã hội (${platform} post) dựa trên thông tin sau:

**Nền tảng:** ${platform}

**Dữ liệu đầu vào:**
*   **Tiêu đề bài báo:** "${topic}"
*   **Nội dung tóm tắt:** "${topic}"

**Hướng dẫn khai thác nội dung:**
*   Sử dụng đoạn tóm tắt để tạo hook và gây tò mò ngay từ đầu.
*   Tập trung vào khía cạnh truyền cảm hứng của câu chuyện: sự kiên trì, mục tiêu tài chính, hành trình tiết kiệm/đầu tư.
*   Bài viết không cần kể chi tiết toàn bộ câu chuyện mà cần gợi mở để khuyến khích sự tương tác.

**Văn phong:**
*   Thân thiện, gần gũi, dễ đọc, truyền cảm hứng.
*   Sử dụng ngôn ngữ đời thường, tránh thuật ngữ phức tạp.

TUYỆT ĐỐI KHÔNG có lời dẫn giải, không "Ok", không "Đây là bài viết", không có bất kỳ ký tự nào ngoài nội dung bài viết. Trả về TRỰC TIẾP bài đăng hoàn chỉnh.`;
        } else {
            finalUserContent = `Hãy viết một bài đăng ${platform} THẬT DÀI, chia thành nhiều đoạn văn phân tích chuyên sâu về chủ đề: ${topic}`;
        }

        const systemContent = `Bạn là AI viết content chuyên nghiệp, bắt chước hoàn hảo văn phong của {brand_name}. Tuyệt đối KHÔNG dùng hashtag tiếng Anh, chỉ dùng tối đa 3 hashtag tiếng Việt.`;

        const newMessages = [
            { role: "system", content: systemContent },
            { role: "user", content: finalUserContent },
            { role: "assistant", content: cleanedAsst }
        ];
        
        outStream.write(JSON.stringify({ messages: newMessages }) + '\n');
        kept++;
    }
  }
});

rl.on('close', () => {
    outStream.end();
    console.log(`✅ Lọc thành công! Từ ${count} bài gốc, đã TẨY XÓA toàn bộ rác, giữ lại ${kept} bài CHẤT LƯỢNG CAO NHẤT (dài > 250 ký tự).`);
    console.log(`📦 Đã mix 50% Prompt AntBiz và 50% Prompt ngắn. File lưu tại: ${outputFilePath}`);
});
