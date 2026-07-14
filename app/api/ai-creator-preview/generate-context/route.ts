import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { executeWithRotation } from '@/lib/services/geminiRotationManager';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
    if (unauthorized) return unauthorized;

    const body = await request.json();
    const { sourceTitle = '', sourceText = '', qaAnswers = [], language = 'vi' } = body;

    const isVi = language === 'vi';
    const truncatedText = (sourceText || '').substring(0, 3000);
    const answersText = qaAnswers.map((a: any) => `- Hỏi: ${a.question}\n  Trả lời: ${a.answer}`).join('\n');

    const systemInstruction = `Bạn là chuyên gia phân tích thông tin và định hướng truyền thông. 
Nhiệm vụ của bạn là đọc tiêu đề và nội dung bài viết gốc, kết hợp với các câu trả lời định hướng của người dùng, để tạo ra một bản "Context tổng" (Bối cảnh tổng quan) súc tích, chuyên nghiệp bằng ${isVi ? 'tiếng Việt' : 'tiếng Anh'}.`;

    const prompt = `Hãy phân tích thông tin dưới đây và viết một bản Context tổng quan súc tích theo định dạng Markdown.

TIÊU ĐỀ BÀI GỐC: "${sourceTitle}"
NỘI DUNG TÓM TẮT BÀI GỐC:
"${truncatedText}"

ĐỊNH HƯỚNG CỦA NGƯỜI DÙNG:
${answersText || '(Không có)'}

YÊU CẦU ĐẦU RA (Trả về trực tiếp định dạng Markdown với các tiêu đề sau, KHÔNG dùng khối code \`\`\`markdown):
### 📌 Luận điểm cốt lõi (Core Arguments)
(Liệt kê 3-4 ý chính quan trọng nhất của bài viết gốc dưới dạng gạch đầu dòng ngắn gọn)

### 🎯 Đối tượng mục tiêu & Giá trị (Target Audience & Value)
(Mô tả ngắn gọn ai là người đọc chính và họ nhận được giá trị gì)

### 🎭 Giọng điệu & Phong cách (Tone & Style)
(Định nghĩa tông giọng văn phù hợp nhất dựa trên định hướng của người dùng)

### 📢 Thông điệp chính & Kêu gọi hành động (Core Message & CTA)
(Thông điệp cốt lõi cần đọng lại và định hướng CTA chính)

Chú ý: Trả về trực tiếp văn bản Markdown sạch, không có lời dẫn giải hay giải thích thêm.`;

    const result = await executeWithRotation(
      { title: sourceTitle, content: truncatedText },
      async (key, modelName) => {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
        return model.generateContent(prompt);
      },
      'low' // Tác vụ phân tích và tóm tắt cơ bản - sử dụng model Flash Lite tiết kiệm
    );

    const response = await result.response;
    const text = response.text().trim();

    return NextResponse.json({ success: true, context: text });
  } catch (error: any) {
    console.error('[generate-context API] Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
