// API: /api/ai-creator-preview/suggest-questions
// Returns 4 structured Q&A questions:
// - Q1 (fixed question): about target audience — AI generates 4 options
// - Q2 (fixed question): about writing tone — AI generates 4 options
// - Q3 (AI question+options): context-specific deep dive
// - Q4 (AI question+options): context-specific deep dive
import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { executeWithRotation } from '@/lib/services/geminiRotationManager';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

export const maxDuration = 30;

interface QuestionItem {
  id: string;
  isFixed: boolean;
  question: string;
  options: string[]; // 4 options + "Khác..." at end
}

export async function POST(request: NextRequest) {
  try {
    const { unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
    if (unauthorized) return unauthorized;

    const body = await request.json();
    const { sourceTitle = '', sourceText = '', platform = 'facebook', language = 'vi' } = body;

    const isVi = language === 'vi';
    const truncatedText = (sourceText || '').substring(0, 2000);
    const platformLabel = platform === 'facebook' ? 'Facebook' : platform === 'threads' ? 'Threads' : 'Instagram';
    const otherLabel = isVi ? 'Khác...' : 'Other...';

    // Fixed Q1 & Q2 base questions
    const q1Text = isVi
      ? 'Đối tượng hướng đến của bài viết này là ai?'
      : 'Who is the target audience for this content?';
    const q2Text = isVi
      ? `Bạn muốn giọng văn của bài đăng ${platformLabel} như thế nào?`
      : `What tone do you want for the ${platformLabel} post?`;

    const systemPrompt = `Bạn là AI chuyên gia phân tích nội dung và định hướng truyền thông chiến lược.

Dưới đây là tài liệu nguồn người dùng vừa cung cấp để tạo bài đăng ${platformLabel}:
TIÊU ĐỀ: ${sourceTitle || '(không có)'}
NỘI DUNG: ${truncatedText || '(không có)'}

Nhiệm vụ của bạn là đưa ra định hướng khai thác nội dung thật SÂU SẮC, CỤ THỂ, và BÁM SÁT nội dung gốc.
VỚI MỖI CÂU HỎI, bạn phải sinh 4 gợi ý trả lời. Trong 4 gợi ý đó, HÃY CHỌN 1 GỢI Ý MÀ BẠN ĐÁNH GIÁ LÀ TỐT NHẤT CHO NỘI DUNG NÀY VÀ THÊM TIỀN TỐ "(Recommend) " vào trước nội dung gợi ý đó. KHÔNG ĐƯỢC QUÊN TIỀN TỐ NÀY ở 1 trong 4 lựa chọn.

1. Cho câu hỏi cố định 1 về ĐỐI TƯỢNG: "${q1Text}"
   → Sinh ra 4 nhóm đối tượng RẤT CỤ THỂ và chi tiết. (VD thay vì "người đi làm", hãy viết "Dân văn phòng bận rộn muốn tối ưu thời gian"). Nhớ thêm "(Recommend) " cho 1 lựa chọn.

2. Cho câu hỏi cố định 2 về GIỌNG VĂN: "${q2Text}"
   → Sinh 4 phong cách hành văn chi tiết, định hướng cảm xúc rõ ràng. (VD: "Phân tích sắc sảo, số liệu dẫn chứng thuyết phục" hoặc "Storytelling đồng cảm, nhẹ nhàng"). Nhớ thêm "(Recommend) " cho 1 lựa chọn.

3. Sinh câu hỏi SÂU thứ 3: AI tự nghĩ ra câu hỏi ĐỊNH HƯỚNG LUẬN ĐIỂM CHÍNH.
   → Đặt câu hỏi về việc nên tập trung vào góc nhìn nào, nỗi đau (pain point) nào của khách hàng, hay bài học chính nào từ bài viết.
   → Sinh 4 gợi ý trả lời (là 4 hướng tiếp cận luận điểm khác nhau). Nhớ thêm "(Recommend) " cho 1 lựa chọn.

4. Sinh câu hỏi SÂU thứ 4: AI tự nghĩ ra câu hỏi về MỤC TIÊU/KẾT QUẢ ĐẦU RA.
   → Đặt câu hỏi về việc bài viết nên chốt lại bằng thông điệp gì, định hướng dư luận ra sao, hoặc kêu gọi hành động (CTA) chiến lược nào.
   → Sinh 4 gợi ý trả lời. Nhớ thêm "(Recommend) " cho 1 lựa chọn.

QUAN TRỌNG: Trả về JSON hợp lệ ĐÚNG định dạng này, không thêm gì khác:
{
  "q1Options": ["(Recommend) gợi ý 1", "gợi ý 2", "gợi ý 3", "gợi ý 4"],
  "q2Options": ["gợi ý 1", "(Recommend) gợi ý 2", "gợi ý 3", "gợi ý 4"],
  "q3Question": "câu hỏi thứ 3 (về luận điểm)",
  "q3Options": ["gợi ý 1", "gợi ý 2", "(Recommend) gợi ý 3", "gợi ý 4"],
  "q4Question": "câu hỏi thứ 4 (về mục tiêu)",
  "q4Options": ["gợi ý 1", "gợi ý 2", "gợi ý 3", "(Recommend) gợi ý 4"]
}`;

    let parsed: {
      q1Options: string[];
      q2Options: string[];
      q3Question: string;
      q3Options: string[];
      q4Question: string;
      q4Options: string[];
    } | null = null;

    try {
      const raw = await executeWithRotation(
        { title: sourceTitle || 'Content', content: truncatedText || 'content' },
        async (key, modelName) => {
          const genAI = new GoogleGenerativeAI(key);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { 
              temperature: 0.6, 
              responseMimeType: 'application/json',
              responseSchema: {
                type: SchemaType.OBJECT,
                properties: {
                  q1Options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  q2Options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  q3Question: { type: SchemaType.STRING },
                  q3Options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  q4Question: { type: SchemaType.STRING },
                  q4Options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                },
                required: ['q1Options', 'q2Options', 'q3Question', 'q3Options', 'q4Question', 'q4Options']
              }
            },
          });
          const result = await model.generateContent(systemPrompt);
          return result.response.text();
        },
        'low' // Task đơn giản: sinh câu hỏi định hướng — không cần model mạnh
      );

      const cleanJson = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch (err) {
      console.error('[suggest-questions] Gemini error:', err);
    }

    // Fallback defaults
    const fallbackQ1Opts = isVi
      ? ['Người dùng phổ thông', 'Khách hàng tiềm năng', 'Chuyên gia trong ngành', 'Người mới tìm hiểu']
      : ['General public', 'Potential customers', 'Industry professionals', 'Beginners'];

    const fallbackQ2Opts = isVi
      ? ['Chuyên nghiệp & Trang trọng', 'Thân thiện & Gần gũi', 'Năng động & Trẻ trung', 'Cảm xúc & Truyền cảm hứng']
      : ['Professional & Formal', 'Friendly & Approachable', 'Energetic & Youthful', 'Emotional & Inspiring'];

    const fallbackQ3 = {
      question: isVi ? 'Mục tiêu chính của bài đăng này là gì?' : 'What is the main goal of this post?',
      options: isVi
        ? ['Tăng nhận thức thương hiệu', 'Thu hút khách hàng mới', 'Giữ chân khách hàng cũ', 'Tăng lượng tương tác']
        : ['Brand awareness', 'Attract new customers', 'Retain existing customers', 'Increase engagement'],
    };

    const fallbackQ4 = {
      question: isVi ? 'Bạn muốn kết thúc bài đăng bằng hành động nào?' : 'What CTA should end the post?',
      options: isVi
        ? ['Kêu gọi bình luận/chia sẻ', 'Link đến website/sản phẩm', 'Đặt câu hỏi cho người đọc', 'Không cần CTA cụ thể']
        : ['Comment/Share CTA', 'Link to website/product', 'Ask readers a question', 'No specific CTA'],
    };

    const questions: QuestionItem[] = [
      {
        id: 'q1',
        isFixed: true,
        question: q1Text,
        options: [...(parsed?.q1Options?.slice(0, 4) || fallbackQ1Opts), otherLabel],
      },
      {
        id: 'q2',
        isFixed: true,
        question: q2Text,
        options: [...(parsed?.q2Options?.slice(0, 4) || fallbackQ2Opts), otherLabel],
      },
      {
        id: 'q3',
        isFixed: false,
        question: parsed?.q3Question || fallbackQ3.question,
        options: [...(parsed?.q3Options?.slice(0, 4) || fallbackQ3.options), otherLabel],
      },
      {
        id: 'q4',
        isFixed: false,
        question: parsed?.q4Question || fallbackQ4.question,
        options: [...(parsed?.q4Options?.slice(0, 4) || fallbackQ4.options), otherLabel],
      },
    ];

    return NextResponse.json({ questions });
  } catch (error: any) {
    console.error('[suggest-questions API] Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
