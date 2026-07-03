import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { z } from 'zod';
import { GoogleGenerativeAI } from "@google/generative-ai";

const wizardSchema = z.object({
  platform: z.enum(['facebook', 'thread', 'instagram', 'threads']),
  tone: z.string(),
  length: z.string(),
  emphasis: z.string(),
  variantCount: z.number().int().min(2).max(3),
});

/**
 * POST /api/prompt-configs/from-wizard
 * Sinh prompt template thông minh bằng Gemini dựa theo 5 lựa chọn cấu hình định hướng.
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
    const parsed = wizardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const { platform, tone, length, emphasis, variantCount } = parsed.data;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      systemInstruction: "Bạn là một chuyên gia Prompt Engineering. Bạn CHỈ trả về nội dung prompt được yêu cầu. TUYỆT ĐỐI KHÔNG có lời chào, không giải thích, không 'Ok', không 'Đây là prompt'. Chỉ trả về duy nhất nội dung prompt.",
    });

    const instruction = `Bạn là một chuyên gia Prompt Engineering.
Hãy viết một Prompt (câu lệnh) chi tiết để yêu cầu một AI khác viết bài đăng mạng xã hội.

Dữ liệu đầu vào:
- Nền tảng mục tiêu: ${platform}
- Văn phong mong muốn (Tone): ${tone}
- Độ dài yêu cầu: ${length}
- Khía cạnh cần nhấn mạnh (Emphasis): ${emphasis}
- Số lượng biến thể sinh ra: ${variantCount}

Yêu cầu đối với Prompt bạn tạo ra:
1. Prompt phải quy định rõ AI đóng vai trò là một chuyên gia Content Marketer viết bài đăng mạng xã hội cho nền tảng ${platform}.
2. Prompt phải quy định cấu trúc bài viết (Hook giật gân, Body triển khai chi tiết, CTA rõ ràng thúc đẩy hành động, Hashtag xu hướng).
3. Prompt phải quy định rõ văn phong bài viết là "${tone}", độ dài bài viết là "${length}", và phải tập trung làm nổi bật khía cạnh: "${emphasis}".
4. Prompt phải hướng dẫn AI cách đọc tiêu đề bài viết từ placeholder [Tiêu đề] và nội dung tóm tắt từ placeholder [Nội dung bài viết] để phân tích và viết bài.
5. Prompt được tạo ra phải có chỉ dẫn nghiêm ngặt yêu cầu AI viết bài: "TUYỆT ĐỐI KHÔNG có lời dẫn giải, không 'Ok', không 'Đây là bài viết'. Trả về TRỰC TIẾP bài đăng hoàn chỉnh."
6. TUYỆT ĐỐI KHÔNG có lời dẫn giải, không "Chào bạn", không "Ok", không "Đây là prompt", không có bất kỳ ký tự nào ngoài nội dung prompt. Trả về TRỰC TIẾP nội dung prompt.`;

    const result = await model.generateContent(instruction);
    const response = await result.response;
    const promptText = response.text().trim();

    return NextResponse.json({ prompt: promptText });
  } catch (error: any) {
    console.error('[Generate Prompt From Wizard Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi tạo Prompt từ Wizard' }, { status: 500 });
  }
}
