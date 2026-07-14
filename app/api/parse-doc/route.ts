import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import mammoth from 'mammoth';

// Route cho phép chạy tối đa 60 giây vì parse PDF lớn qua Gemini có thể mất thời gian
export const maxDuration = 60;

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc'];

/**
 * Trích xuất text từ PDF sử dụng Gemini API (hỗ trợ cả tài liệu scan/ảnh nhờ OCR)
 */
async function extractTextFromPdfWithGemini(pdfBuffer: Buffer, geminiKey: string): Promise<string> {
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const modelsToTry = [
    primaryModel,
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-lite'
  ].filter((val, index, self) => self.indexOf(val) === index);

  const base64Data = pdfBuffer.toString('base64');
  let lastError = '';

  for (const modelName of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: base64Data,
                  },
                },
                {
                  text: 'Nhiệm vụ của bạn là trích xuất toàn bộ văn bản từ tài liệu PDF này một cách chính xác nhất có thể. Giữ nguyên cấu trúc xuống dòng và trật tự nội dung của tài liệu. KHÔNG tóm tắt, KHÔNG thêm bớt từ ngữ, KHÔNG thêm lời giải thích hay bất kỳ lời dẫn nào. Chỉ trả về nội dung văn bản trích xuất được.',
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.1 },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text: string =
          data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
        return text.trim();
      }

      const errText = await response.text();
      lastError = errText;
      console.warn(`[PDF Parse] Model ${modelName} failed (${response.status}): ${errText}`);
      if (response.status === 429 || errText.includes('quota') || errText.includes('Quota')) {
        continue; // Try next model
      } else {
        throw new Error(`Gemini PDF parse failed with ${modelName} (${response.status}): ${errText}`);
      }
    } catch (err: any) {
      if (err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('Quota')) {
        continue; // Try next model
      }
      throw err;
    }
  }

  throw new Error(`Gemini PDF parse failed all models. Last error: ${lastError}`);
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const { unauthorized } = await requireUserWithRole([
      'admin',
      'marketer_full',
      'marketer_content',
    ]);
    if (unauthorized) return unauthorized;

    // 2. Parse form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Request phải là multipart/form-data' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file tải lên' }, { status: 400 });
    }

    // 3. Check file extension
    const fileName = file.name.toLowerCase();
    const isDocx = fileName.endsWith('.docx') || fileName.endsWith('.doc');
    const isPdf = fileName.endsWith('.pdf');

    if (!isDocx && !isPdf) {
      return NextResponse.json(
        { error: 'Định dạng file không được hỗ trợ. Chỉ hỗ trợ file PDF (.pdf) hoặc Word (.docx)' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let extractedText = '';

    if (isDocx) {
      // Sử dụng mammoth để trích xuất text từ file docx
      console.log(`[ParseDoc] Parsing Word file: ${file.name}`);
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || '';
      if (result.messages && result.messages.length > 0) {
        console.warn('[ParseDoc] Mammoth messages:', result.messages);
      }
    } else if (isPdf) {
      // Sử dụng Gemini để trích xuất text từ file PDF
      console.log(`[ParseDoc] Parsing PDF file: ${file.name}`);
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return NextResponse.json({ error: 'Chưa cấu hình GEMINI_API_KEY để xử lý file PDF' }, { status: 500 });
      }
      extractedText = await extractTextFromPdfWithGemini(buffer, geminiKey);
    }

    extractedText = extractedText.trim();
    if (!extractedText) {
      return NextResponse.json({ error: 'Không thể trích xuất văn bản từ tài liệu này hoặc tài liệu trống' }, { status: 422 });
    }

    return NextResponse.json({ text: extractedText });
  } catch (error: any) {
    console.error('[ParseDoc API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi hệ thống khi trích xuất tài liệu' },
      { status: 500 }
    );
  }
}
