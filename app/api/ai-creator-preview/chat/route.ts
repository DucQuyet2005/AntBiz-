// API route: /api/ai-creator-preview/chat
// Xử lý chat AI với context + highlight, trả về SSE stream
import { NextRequest } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { executeWithRotation } from '@/lib/services/geminiRotationManager';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

function createSSEResponse() {
  let controller: ReadableStreamDefaultController;
  const stream = new ReadableStream({
    start(c) { controller = c; }
  });

  const send = (data: object) => {
    const line = `data: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(new TextEncoder().encode(line));
  };

  const close = () => {
    controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
    controller.close();
  };

  const response = new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });

  return { response, send, close };
}

export async function POST(request: NextRequest) {
  const { unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const {
    systemContext: {
      sourceTitle = '',
      sourceText = '',
      currentPlatformContent = '',
      highlightedPortion = '',
      platform = 'facebook',
      presetRules = '',
      conversationHistory = [],
    },
    userMessage = '',
  } = body;

  if (!userMessage.trim()) {
    return new Response('data: {"error":"Tin nhắn trống"}\n\ndata: [DONE]\n\n', {
      headers: { 'Content-Type': 'text/event-stream' }
    });
  }

  const platformLabel = platform === 'facebook' ? 'Facebook' : platform === 'threads' ? 'Threads' : 'Instagram';
  const truncatedSource = (sourceText || '').substring(0, 2000);
  const truncatedContent = (currentPlatformContent || '').substring(0, 3000);

  const systemInstruction = `Bạn là AI chuyên gia tạo và chỉnh sửa nội dung mạng xã hội ${platformLabel} chuyên nghiệp.
 
NỘI DUNG NGUỒN (tài liệu gốc):
Tiêu đề: ${sourceTitle || '(Chưa có tiêu đề)'}
${truncatedSource}
 
${presetRules ? `QUY CHUẨN NỀN TẢNG ${platformLabel.toUpperCase()}:\n${presetRules}\n` : ''}
 
NỘI DUNG BÀI ĐĂNG HIỆN TẠI (${platformLabel}):
${truncatedContent || '(Chưa có nội dung)'}
 
${highlightedPortion ? `NGƯỜI DÙNG ĐÃ BÔI ĐEN ĐOẠN SAU ĐỂ CHỈNH SỬA:\n"${highlightedPortion}"\n` : ''}
 
NHIỆM VỤ: Dựa vào yêu cầu người dùng, hãy chỉnh sửa hoặc cải thiện nội dung bài đăng. 
${highlightedPortion ? `
- Bạn chỉ được phép trả về duy nhất đoạn văn bản mới đã được chỉnh sửa/rút gọn/sửa lỗi từ đoạn bôi đen "${highlightedPortion}" theo yêu cầu.
- TUYỆT ĐỐI KHÔNG trả về toàn bộ bài đăng, không thêm lời dẫn, không giải thích.
` : `
- Trả về TOÀN BỘ nội dung bài đăng đã cập nhật mới.
- TUYỆT ĐỐI KHÔNG giải thích hay thêm lời dẫn.
`}
- Chỉ trả về nội dung text kết quả, không thêm markdown formatting không cần thiết.`;

  const { response, send, close } = createSSEResponse();

  (async () => {
    try {
      // Ép hệ thống dùng Flash (high/medium) khi sửa bài, và Flash Lite (low) khi trò chuyện
      const metrics = highlightedPortion 
        ? { title: 'Edit', content: 'x'.repeat(4000), layout: 'longform' } 
        : { title: 'Chat', content: 'x', layout: 'standard' };

      await executeWithRotation(
        metrics,
        async (key, modelName) => {
          const genAI = new GoogleGenerativeAI(key);
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction,
            generationConfig: { temperature: 0.7 },
          });

          // Build history từ conversationHistory
          const history = (conversationHistory || []).map((msg: { role: string; content: string }) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
          }));

          const chat = model.startChat({ history });
          const streamResult = await chat.sendMessageStream(userMessage);

          let fullContent = '';
          for await (const chunk of streamResult.stream) {
            const text = chunk.text();
            if (text) {
              fullContent += text;
              send({ text });
            }
          }

          send({ done: true, updatedContent: fullContent });
          return fullContent;
        }
      );
    } catch (err: any) {
      console.error('[chat API] Error:', err);
      send({ error: err.message || 'Lỗi AI' });
    } finally {
      close();
    }
  })();

  return response;
}
