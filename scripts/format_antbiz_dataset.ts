import fs from 'fs';
import readline from 'readline';

const inputFilePath = './scripts/dataset_social_generic.jsonl';
const outputFilePath = './scripts/dataset_antbiz.jsonl';

// Các từ khóa hashtag tiếng Anh phổ biến cần lọc bỏ khỏi tập train
const englishWords = ['leadership', 'management', 'hr', 'humanresources', 'career', 'development', 'business', 'motivation', 'threads', 'facebook', 'instagram', 'post', 'viral', 'trend', 'recruitment', 'talent', 'acquisition'];

function cleanHashtags(text: string): string {
    let cleaned = text;
    // Xóa các hashtag có chứa từ tiếng Anh
    for (const en of englishWords) {
        const regex = new RegExp(`#\\w*${en}\\w*`, 'gi');
        cleaned = cleaned.replace(regex, '');
    }
    
    // Giữ lại tối đa 3 hashtag
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

rl.on('line', (line) => {
  if (!line.trim()) return;
  const item = JSON.parse(line);
  const messages = item.messages;
  
  const userMsg = messages.find((m: any) => m.role === 'user');
  const asstMsg = messages.find((m: any) => m.role === 'assistant');
  
  if (userMsg && asstMsg) {
    // Bóc tách nền tảng và chủ đề từ prompt cũ
    const match = userMsg.content.match(/Hãy viết một bài đăng (Facebook|Threads|Instagram) chia sẻ về chủ đề: (.*)/);
    if (match) {
        const platform = match[1];
        const topic = match[2];
        
        // 1. Dọn dẹp hashtag tiếng Anh trong câu trả lời để AI không học thói quen xấu
        const cleanedAsst = cleanHashtags(asstMsg.content);
        
        // 2. Gói trọn prompt AntBiz vào tập huấn luyện
        const antbizUserContent = `Bạn là một Content Marketer chuyên nghiệp. Hãy viết một bài đăng mạng xã hội (${platform} post) dựa trên thông tin sau:

**Nền tảng:** ${platform}

**Dữ liệu đầu vào:**
*   **Tiêu đề bài báo:** "${topic}"
*   **Nội dung tóm tắt:** "${topic}"

**Hướng dẫn khai thác nội dung:**
*   Sử dụng đoạn tóm tắt để tạo hook và gây tò mò ngay từ đầu.
*   Tập trung vào khía cạnh truyền cảm hứng của câu chuyện: sự kiên trì, mục tiêu tài chính, hành trình tiết kiệm/đầu tư để đạt được mục tiêu.
*   Bài viết không cần kể chi tiết toàn bộ câu chuyện mà cần gợi mở để khuyến khích sự tương tác và muốn tìm hiểu thêm.

**Văn phong:**
*   Thân thiện, gần gũi, dễ đọc, truyền cảm hứng.
*   Sử dụng ngôn ngữ đời thường, tránh thuật ngữ phức tạp.
*   Khuyến khích sự tương tác, đặt câu hỏi gợi mở.

**Cấu trúc bài viết:**
1.  **Hook (Móc câu):** Bắt đầu mạnh mẽ, gây tò mò hoặc bất ngờ từ đoạn tóm tắt. Có thể là một câu hỏi hoặc một phát biểu gây chú ý.
2.  **Body (Nội dung chính):** Phát triển câu chuyện ngắn gọn, nhấn mạnh cảm giác nhẹ nhõm và thành quả. Nhấn mạnh sự nỗ lực và bài học.
3.  **Call to Action (CTA - Kêu gọi hành động):** Khuyến khích người đọc bình luận, chia sẻ quan điểm, hoặc kể về câu chuyện/mục tiêu của họ.
4.  **Hashtag:** Đề xuất 3-5 hashtag liên quan, phổ biến và có khả năng viral.

TUYỆT ĐỐI KHÔNG có lời dẫn giải, không "Ok", không "Đây là bài viết", không có bất kỳ ký tự nào ngoài nội dung bài viết. Trả về TRỰC TIẾP bài đăng hoàn chỉnh.`;

        // 3. Đưa System Prompt cấm hashtag tiếng Anh vào tập huấn luyện
        const systemContent = `Bạn là AI viết content chuyên nghiệp, bắt chước hoàn hảo văn phong của {brand_name}. Tuyệt đối KHÔNG dùng hashtag tiếng Anh, chỉ dùng tối đa 3 hashtag tiếng Việt.`;

        const newMessages = [
            { role: "system", content: systemContent },
            { role: "user", content: antbizUserContent },
            { role: "assistant", content: cleanedAsst }
        ];
        
        outStream.write(JSON.stringify({ messages: newMessages }) + '\n');
        count++;
    }
  }
});

rl.on('close', () => {
    outStream.end();
    console.log(`✅ Đã chuyển đổi thành công ${count} bài sang chuẩn AntBiz!`);
    console.log(`📦 File mới được lưu tại: ${outputFilePath}`);
});
