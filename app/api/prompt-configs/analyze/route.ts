import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { z } from 'zod';
import { GoogleGenerativeAI } from "@google/generative-ai";

const analyzeSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export async function POST(request: NextRequest) {
  const { unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Thiếu GEMINI_API_KEY trong .env' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { title, content } = analyzeSchema.parse(body);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
      systemInstruction: "Bạn là chuyên gia AI phân tích nội dung báo chí. Hãy đề xuất các tham số cấu hình viết bài tối ưu dưới định dạng JSON.",
    });

    const instruction = `Dựa trên tiêu đề bài báo và nội dung tóm tắt dưới đây, hãy đề xuất cấu hình viết bài đăng mạng xã hội.

**Dữ liệu bài viết:**
- Tiêu đề: "${title}"
- Tóm tắt nội dung: "${content}"

**Yêu cầu đề xuất:**
1. "tone": Chọn duy nhất 1 trong các văn phong sau: "Chuyên nghiệp", "Thân thiện", "Hài hước", "Sắc sảo", "Storytelling", "Trang trọng", "Đơn giản".
2. "length": Chọn duy nhất 1 trong các độ dài sau: "Ngắn (dưới 200 từ)", "Vừa (200-500 từ)", "Dài (trên 500 từ)".
3. "emphasis": Trích xuất khía cạnh đắt giá/quan trọng nhất của bài viết để làm điểm nhấn chính (dưới 15 từ).

Hãy trả về chuỗi JSON hợp lệ theo cấu trúc sau:
{
  "tone": "Văn phong được chọn",
  "length": "Độ dài được chọn",
  "emphasis": "Nội dung nhấn mạnh đề xuất"
}`;

    const result = await model.generateContent(instruction);
    const response = await result.response;
    const jsonText = response.text().trim();
    const parsed = JSON.parse(jsonText);

    return NextResponse.json({
      tone: parsed.tone || "Chuyên nghiệp",
      length: parsed.length || "Vừa (200-500 từ)",
      emphasis: parsed.emphasis || "",
    });
  } catch (error: any) {
    console.error('[Analyze Article Config Error]:', error);
    return NextResponse.json({
      tone: "Chuyên nghiệp",
      length: "Vừa (200-500 từ)",
      emphasis: "",
    });
  }
}
