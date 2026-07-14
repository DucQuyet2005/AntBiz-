// API route: /api/ai-creator-preview/suggest
// Nhận yêu cầu người dùng, trả về 3 đề xuất chỉnh sửa cụ thể
import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { executeWithRotation } from '@/lib/services/geminiRotationManager';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const { unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const {
    userMessage = '',
    currentPlatformContent = '',
    platform = 'facebook',
    globalContext = '',
    sourceTitle = '',
  } = body;

  if (!userMessage.trim()) {
    return NextResponse.json({ suggestions: [] });
  }

  const platformLabel = platform === 'facebook' ? 'Facebook' : platform === 'threads' ? 'Threads' : 'Instagram';
  const truncatedContent = (currentPlatformContent || '').substring(0, 2000);

  const systemInstruction = `Bạn là AI trợ lý chỉnh sửa nội dung mạng xã hội ${platformLabel}.

BỐI CẢNH:
${globalContext || '(Chưa có bối cảnh)'}

NỘI DUNG BÀI ĐĂNG HIỆN TẠI (${platformLabel}):
${truncatedContent || '(Chưa có nội dung)'}

NHIỆM VỤ: Dựa trên yêu cầu người dùng bên dưới, hãy đề xuất đúng 3 cách chỉnh sửa cụ thể, khác nhau, rõ ràng, ngắn gọn (mỗi đề xuất tối đa 15 từ).
Trả về đúng định dạng JSON sau, không thêm bất kỳ text nào khác:
{"suggestions": ["Đề xuất 1", "Đề xuất 2", "Đề xuất 3"]}`;

  try {
    let result: string[] = [];

    await executeWithRotation(
      { title: 'Suggest', content: userMessage },
      async (key, modelName) => {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
          generationConfig: { temperature: 0.8, responseMimeType: 'application/json' },
        });

        const response = await model.generateContent(userMessage);
        const text = response.response.text().trim();

        try {
          const parsed = JSON.parse(text);
          result = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [];
        } catch {
          // Try to extract JSON from text
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            result = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [];
          }
        }

        return text;
      },
      'low'
    );

    return NextResponse.json({ suggestions: result });
  } catch (err: any) {
    console.error('[suggest API] Error:', err);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
