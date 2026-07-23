import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { executeWithGeminiCapacity } from '@/backend/modules/gemini-capacity';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { selectedText, topic } = body;

    if (!selectedText || typeof selectedText !== 'string' || !selectedText.trim()) {
      return NextResponse.json({ error: 'Missing selectedText' }, { status: 400 });
    }

    const systemInstruction = `Bạn là chuyên gia biên tập nội dung AI. Hãy đọc đoạn văn bản được chọn bên dưới và tạo ra đúng 6 câu gợi ý phong cách ngắn gọn giúp người dùng chọn hướng sửa cho bài viết.
Trả về duy nhất 1 mảng JSON chứa 6 object theo đúng định dạng:
[
  {"label": "✨ Tóm tắt ngắn gọn", "prompt": "Rút gọn đoạn này lại súc tích, cô đọng nhất"},
  {"label": "💔 Tăng tính đồng cảm", "prompt": "Viết lại với văn phong sâu lắng, giàu cảm xúc và sự đồng cảm"},
  {"label": "📢 Văn phong thời sự", "prompt": "Chuyển sang giọng văn báo chí thời sự trung lập, khách quan"},
  {"label": "🔥 Viết lại thu hút", "prompt": "Tạo giọng văn giật gân, cuốn hút gây sự chú ý mạnh mẽ"},
  {"label": "👔 Văn phong chuyên nghiệp", "prompt": "Chuyển sang văn phong chuyên nghiệp, chuẩn mực"},
  {"label": "📣 Thêm lời kêu gọi", "prompt": "Thêm lời kêu gọi hành động (CTA) thúc đẩy tương tác ở cuối đoạn"}
]
TUYỆT ĐỐI KHÔNG có lời mở đầu, không trích dẫn, chỉ trả về duy nhất mảng JSON.`;

    const userPrompt = `Chủ đề bài viết: ${topic || 'Nội dung chung'}\nĐoạn văn được chọn: "${selectedText.slice(0, 500)}"`;

    let suggestions: Array<{ label: string; prompt: string }> = [];

    try {
      const result = await executeWithGeminiCapacity(
        { title: topic || 'Nội dung chung', content: selectedText },
        async (key, modelName) => {
          const genAI = new GoogleGenerativeAI(key);
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction,
          });
          const response = await model.generateContent(userPrompt);
          const rawText = response.response.text().trim();
          const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(cleanJson);
        }
      );
      if (Array.isArray(result) && result.length > 0) {
        suggestions = result;
      }
    } catch (err) {
      console.warn('[Gemini Suggestions Route] Fallback to contextual heuristic:', err);
    }

    // Heuristic fallback if Gemini API key fails or network times out
    if (!suggestions || suggestions.length === 0) {
      const charCount = selectedText.length;
      const isQuestion = selectedText.includes('?') || selectedText.includes('sao') || selectedText.includes('gì');
      const hasNumbers = /\d+/.test(selectedText);
      const hasEmotionalWords = /(thảm kịch|kinh hoàng|nỗi đau|xót xa|bàng hoàng|vô tội|nạn nhân|nghiêm trọng)/i.test(selectedText);

      if (charCount > 120) {
        suggestions.push({ label: '✨ Tóm tắt ngắn gọn', prompt: 'Rút gọn đoạn này lại súc tích, cô đọng nhất' });
      } else {
        suggestions.push({ label: '✍️ Bổ sung chi tiết', prompt: 'Viết mở rộng thêm chi tiết và góc nhìn sâu sắc hơn' });
      }

      if (hasEmotionalWords) {
        suggestions.push({ label: '💔 Tăng tính đồng cảm', prompt: 'Viết lại với văn phong sâu lắng, giàu cảm xúc và sự đồng cảm' });
        suggestions.push({ label: '📢 Văn phong thời sự', prompt: 'Chuyển sang giọng văn báo chí thời sự trung lập, khách quan' });
      } else {
        suggestions.push({ label: '🔥 Viết lại thu hút', prompt: 'Tạo giọng văn giật gân, cuốn hút gây sự chú ý mạnh mẽ' });
        suggestions.push({ label: '👔 Chuyên nghiệp', prompt: 'Chuyển sang văn phong chuyên nghiệp, chuẩn mực' });
      }

      if (isQuestion) {
        suggestions.push({ label: '❓ Đặt câu hỏi mở', prompt: 'Chuyển đoạn này thành câu hỏi mở thảo luận cho cộng đồng' });
      } else if (hasNumbers) {
        suggestions.push({ label: '📊 Tóm tắt số liệu', prompt: 'Trình bày lại các con số/dữ liệu này rõ ràng và ấn tượng hơn' });
      } else {
        suggestions.push({ label: '📣 Thêm lời kêu gọi', prompt: 'Thêm lời kêu gọi hành động (Call To Action) thúc đẩy tương tác ở cuối đoạn' });
      }

      suggestions.push({ label: '✨ Tối ưu icon & hashtag', prompt: 'Bổ sung thêm emoji phù hợp và hashtag chuẩn bài' });
      suggestions.push({ label: '🎯 Đặt câu chốt ngắn', prompt: 'Tạo một câu kết thúc ngắn đắt giá và dễ nhớ' });
    }

    return NextResponse.json({
      success: true,
      suggestions: suggestions.slice(0, 6),
      modelUsed: 'Gemini 3.1 Flash Lite',
    });
  } catch (error) {
    console.error('[Gemini Suggestions Route] Error:', error);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}
