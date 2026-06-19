import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { z } from 'zod';
import { GoogleGenerativeAI } from "@google/generative-ai";

const smartPromptSchema = z.object({
  title: z.string(),
  content: z.string(),
  platform: z.enum(['facebook', 'thread', 'instagram', 'threads']),
});

/**
 * POST /api/prompts/generate-smart
 * Dùng AI để viết ra một PROMPT chất lượng cao dựa trên nội dung bài báo.
 */
export async function POST(request: NextRequest) {
  const { unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Thiếu GEMINI_API_KEY trong .env' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { title, content, platform } = smartPromptSchema.parse(body);

    const genAI = new GoogleGenerativeAI(apiKey);
    // Sử dụng model 2.5-flash mới nhất với system instruction để cực kỳ nghiêm ngặt
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      systemInstruction: "Bạn là một chuyên gia Prompt Engineering. Bạn CHỈ trả về nội dung prompt được yêu cầu. TUYỆT ĐỐI KHÔNG có lời chào, không giải thích, không 'Ok', không 'Đây là prompt'. Chỉ trả về duy nhất nội dung prompt.",
    });

    const instruction = `Bạn là một chuyên gia Prompt Engineering.
Hãy viết một Prompt (câu lệnh) chi tiết để yêu cầu một AI khác viết bài đăng mạng xã hội.

Dữ liệu đầu vào:
- Nền tảng: ${platform}
- Tiêu đề bài báo: ${title}
- Nội dung tóm tắt: ${content}

Yêu cầu đối với Prompt bạn tạo ra:
1. Prompt phải mô tả rõ vai trò của AI (Content Marketer).
2. Prompt phải hướng dẫn cách khai thác nội dung từ bài báo trên.
3. Prompt phải quy định rõ văn phong phù hợp với ${platform}.
4. Prompt phải yêu cầu cấu trúc bài viết (Hook, Body, CTA, Hashtag).
5. TUYỆT ĐỐI KHÔNG có lời dẫn giải, không "Chào bạn", không "Ok", không "Đây là prompt", không có bất kỳ ký tự nào ngoài nội dung prompt. Trả về TRỰC TIẾP nội dung prompt.`;

    const result = await model.generateContent(instruction);
    const response = await result.response;
    const smartPromptText = response.text();

    return NextResponse.json({ smartPrompt: smartPromptText });
  } catch (error: any) {
    console.error('[Generate Smart Prompt Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi tạo Smart Prompt' }, { status: 500 });
  }
}
