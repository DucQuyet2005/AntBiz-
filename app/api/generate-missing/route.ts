import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { executeWithGeminiCapacity } from '@/backend/modules/gemini-capacity';
import { GeminiCapacityError } from '@/backend/modules/gemini-capacity/errors';

export const maxDuration = 60; // 60s timeout

/**
 * POST /api/generate-missing
 * Automatically generates missing fields (title, full_text, category, tags) using Gemini with key rotation.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const { unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
    if (unauthorized) return unauthorized;

    // 2. Parse input
    const { title = '', full_text = '', category = '', tags = '' } = await request.json().catch(() => ({}));

    // If both major fields are empty, we cannot generate content
    if (!title.trim() && !full_text.trim()) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp ít nhất tiêu đề hoặc nội dung chi tiết bài viết.' },
        { status: 400 }
      );
    }

    // 3. Construct AI prompt
    const systemInstruction = 
      "Bạn là một biên tập viên và chuyên gia phát triển nội dung marketing chuyên nghiệp.\n" +
      "Nhiệm vụ của bạn là bổ sung các trường thông tin còn thiếu cho bài viết và trả về định dạng JSON thuần túy.\n" +
      "Tuyệt đối không bao gồm markdown code block, không giải thích, không thêm text chào hỏi.";

    const prompt = `
Dưới đây là các trường thông tin hiện có của bài viết:
- Tiêu đề (title): "${title}"
- Nội dung chi tiết (full_text): "${full_text}"
- Danh mục (category): "${category}"
- Từ khóa (tags): "${tags}"

Hãy phân tích dữ liệu trên và tự động sinh các thành phần còn thiếu theo các quy tắc sau:
1. Nếu Tiêu đề (title) bị trống hoặc quá ngắn: Hãy viết một tiêu đề ngắn gọn, súc tích và cuốn hút (dưới 12 từ) dựa trên Nội dung chi tiết (full_text).
2. Nếu Nội dung chi tiết (full_text) bị trống hoặc quá ngắn: Hãy viết một nội dung bài viết chi tiết, có cấu trúc chặt chẽ, chuyên nghiệp (khoảng 200 - 350 từ) dựa trên Tiêu đề (title).
3. Nếu Danh mục (category) bị trống: Hãy chọn một danh mục phù hợp nhất (ví dụ: Công nghệ, Kinh doanh, Giáo dục, Sức khỏe, Đời sống, Tiếp thị...).
4. Nếu Từ khóa (tags) bị trống: Hãy đề xuất 3 - 5 từ khóa liên quan, phân tách bằng dấu phẩy.

Bạn phải trả về một đối tượng JSON có cấu trúc chính xác như sau:
{
  "title": "tiêu đề đã điền hoặc giữ nguyên",
  "full_text": "nội dung chi tiết đã điền hoặc giữ nguyên",
  "category": "danh mục đã điền hoặc giữ nguyên",
  "tags": "các từ khóa phân tách bằng dấu phẩy"
}

Lưu ý quan trọng: Chỉ trả về chuỗi JSON thô, không có ký tự bao ngoài như \`\`\`json hay \`\`\`.
`;

    // 4. Execute with key rotation
    const result = await executeWithGeminiCapacity(
      { title, content: full_text },
      async (key, modelName) => {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
        return model.generateContent(prompt);
      }
    );

    const response = await result.response;
    let jsonText = response.text().trim();

    // Clean up markdown block if model outputted them
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    const parsedData = JSON.parse(jsonText);

    return NextResponse.json({
      success: true,
      data: {
        title: parsedData.title || title,
        full_text: parsedData.full_text || full_text,
        category: parsedData.category || category,
        tags: parsedData.tags || tags,
      }
    });
  } catch (error: unknown) {
    console.error('[Generate Missing]', {
      code: error instanceof GeminiCapacityError ? error.code : 'REQUEST_FAILED',
    });
    return NextResponse.json(
      {
        error: error instanceof GeminiCapacityError
          ? error.clientMessage
          : 'Lỗi hệ thống khi tự động điền thông tin',
      },
      { status: 500 }
    );
  }
}
