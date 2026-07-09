import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { z } from 'zod';
import { GoogleGenerativeAI } from "@google/generative-ai";

const generatePromptSchema = z.object({
  title: z.string(),
  content: z.string(),
  platform: z.enum(['facebook', 'thread', 'instagram', 'threads']),
  customPrompt: z.string().optional(),
});

/**
 * POST /api/prompts/generate
 * Generates content based on article using Gemini 1.5 Flash.
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
    const { title, content, platform, customPrompt } = generatePromptSchema.parse(body);

    const genAI = new GoogleGenerativeAI(apiKey);
    const primaryModelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const systemInstruction = "Bạn là một chuyên gia Content Marketing. Bạn CHỈ trả về nội dung bài viết được yêu cầu. TUYỆT ĐỐI KHÔNG có lời chào, không giải thích, không 'Ok', không 'Đây là bài viết'. Chỉ trả về duy nhất nội dung bài đăng mạng xã hội.";

    const prompt = customPrompt || `Bạn là một chuyên gia Content Marketing. 
Hãy viết một bài đăng cho nền tảng ${platform} dựa trên bài báo sau:
Tiêu đề: ${title}
Nội dung tóm tắt: ${content}

Yêu cầu bài viết:
1. Thu hút, bắt trend và phù hợp với người dùng ${platform}.
2. Có cấu trúc rõ ràng: Hook -> Body -> CTA.
3. Sử dụng Emoji phù hợp.
4. Thêm 3-5 hashtag liên quan.
5. TUYỆT ĐỐI KHÔNG có lời dẫn giải, không "Chào bạn", không "Ok", không "Đây là bài viết", không có bất kỳ ký tự nào ngoài nội dung bài viết. Trả về TRỰC TIẾP bài đăng.`;

    const modelsToTry = [
      primaryModelName,
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash-lite'
    ].filter((val, index, self) => self.indexOf(val) === index);

    let result;
    let success = false;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Prompts Generate] Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
        result = await model.generateContent(prompt);
        success = true;
        break;
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || '';
        console.warn(`[Prompts Generate] Model ${modelName} failed: ${errMsg}`);
        if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('Quota')) {
          continue; // Try next model
        } else {
          throw err;
        }
      }
    }

    if (!success) {
      throw lastError || new Error('All Gemini models failed');
    }
    const response = await result.response;
    const generatedText = response.text();

    return NextResponse.json({ 
      content: generatedText,
      name: `AI Draft: ${title.substring(0, 30)}...`,
      tags: ['AI Generated', platform]
    });
  } catch (error: any) {
    console.error('[Gemini API Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi gọi Gemini API' }, { status: 500 });
  }
}
