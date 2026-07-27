import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { z } from 'zod';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { executeWithGeminiCapacity } from '@/backend/modules/gemini-capacity';
import { GeminiCapacityError } from '@/backend/modules/gemini-capacity/errors';

const smartPromptSchema = z.object({
  title: z.string(),
  content: z.string(),
  platform: z.enum(['facebook', 'thread', 'instagram', 'threads']),
  style: z.string().optional(),
});

/**
 * POST /api/prompts/generate-smart
 * Dùng AI để viết ra một PROMPT chất lượng cao dựa trên nội dung bài báo, sử dụng xoay API keys.
 */
export async function POST(request: NextRequest) {
  const { unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { title, content, platform, style } = smartPromptSchema.parse(body);

    const STYLE_LABELS: Record<string, string> = {
      formal: 'Trang trọng & Báo chí (văn phong chuyên nghiệp, bố cục rõ ràng)',
      storytelling: 'Kể chuyện cảm xúc (dẫn dắt cảm xúc, chạm đến trái tim)',
      persuasive: 'Thuyết phục (nhấn mạnh lợi ích, kêu gọi hành động)',
      snappy: 'Ngắn gọn & Sắc bén (súc tích, viral, dưới 250 ký tự)',
      humorous: 'Hài hước & Dí dỏm (châm biếm nhẹ, gần gũi giới trẻ)',
      controversial: 'Giật gân & Tranh luận (táo bạo, gây tranh luận tích cực)',
      visual: 'Gợi hình ảnh (ngắn gọn, emoji, caption đẹp cho Instagram)',
      lifestyle: 'Phong cách sống (chân thực, cảm xúc, cộng đồng)',
      product: 'Giới thiệu sản phẩm (tập trung tính năng & lợi ích)',
    };
    const styleLabel = style ? (STYLE_LABELS[style] || style) : 'phù hợp với nền tảng';

    const systemInstruction = "Bạn là một chuyên gia Prompt Engineering. Bạn CHỈ trả về nội dung prompt được yêu cầu. TUYỆT ĐỐI KHÔNG có lời chào, không giải thích, không 'Ok', không 'Đây là prompt'. Chỉ trả về duy nhất nội dung prompt.";

    const instruction = `Bạn là một chuyên gia Prompt Engineering.
Hãy viết một Prompt (câu lệnh) chi tiết để yêu cầu một AI khác viết bài đăng mạng xã hội.

Dữ liệu đầu vào:
- Nền tảng: ${platform}
- Phong cách yêu cầu: ${styleLabel}
- Tiêu đề bài báo: ${title}
- Nội dung tóm tắt: ${content}

Yêu cầu đối với Prompt bạn tạo ra:
1. Prompt phải mô tả rõ vai trò của AI (Content Marketer với phong cách: ${styleLabel}).
2. Prompt phải hướng dẫn cách khai thác nội dung từ bài báo trên.
3. Prompt phải quy định rõ văn phong phù hợp với ${platform} theo phong cách "${styleLabel}".
4. Prompt phải yêu cầu cấu trúc bài viết phù hợp với phong cách (Hook, Body, CTA, Hashtag nếu cần).
5. Prompt được tạo ra phải quy định nghiêm ngặt yêu cầu AI viết bài: TUYỆT ĐỐI KHÔNG có lời dẫn giải, không chào hỏi, không có câu chuyển tiếp hay lời dẫn, không có bất kỳ ký tự nào ngoài nội dung bài viết hoàn chỉnh.
6. TUYỆT ĐỐI KHÔNG có lời dẫn giải, không "Chào bạn", không "Ok", không "Đây là prompt", không có bất kỳ ký tự nào ngoài nội dung prompt. Trả về TRỰC TIẼP nội dung prompt.`;

    const result = await executeWithGeminiCapacity(
      { title, content },
      async (key, modelName) => {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
        return model.generateContent(instruction);
      }
    );

    const response = await result.response;
    const smartPromptText = response.text();

    return NextResponse.json({ smartPrompt: smartPromptText });
  } catch (error: unknown) {
    console.error('[Smart Prompt Generation]', {
      code: error instanceof GeminiCapacityError ? error.code : 'REQUEST_FAILED',
    });
    return NextResponse.json({
      error: error instanceof GeminiCapacityError
        ? error.clientMessage
        : 'Lỗi khi tạo Smart Prompt',
    }, { status: 500 });
  }
}
