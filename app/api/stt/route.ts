import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';

// STT: Groq Whisper (free tier, no credit card)
// Rewrite: Gemini (text only — much cheaper than audio tokens)
const GROQ_STT_MODEL = 'whisper-large-v3-turbo';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

const MAX_FILE_SIZE_MB = 25;
const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/x-m4a',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

const REWRITE_SYSTEM_PROMPT = `Bạn là một content writer chuyên nghiệp, chuyên viết bài đăng mạng xã hội thu hút.
Dưới đây là nội dung thô từ giọng nói của một KOL/content creator (có thể là transcript tự động, có lỗi, từ đệm, nói lắp hoặc chỉ là vài ý chính bullet points).
Hãy viết lại thành một bài đăng mạng xã hội hoàn chỉnh, tự nhiên, thu hút người đọc:
- Giữ nguyên ý chính và cá tính/giọng điệu của người nói
- Loại bỏ từ đệm ("ừm", "à", "thì là"), lặp lại, nói lắp
- Thêm hook mạnh ở đầu, CTA ở cuối nếu phù hợp
- Đề xuất 3-5 hashtag phù hợp ở cuối bài

CHỈ TRẢ VỀ BÀI VIẾT HOÀN CHỈNH. TUYỆT ĐỐI KHÔNG có lời dẫn, giới thiệu hay bất kỳ ký tự nào ngoài nội dung bài đăng.`;

/**
 * Transcribe audio via Groq Whisper API.
 * Groq is OpenAI-compatible — single multipart POST, no file pre-upload needed.
 */
async function transcribeWithGroq(file: File, groqKey: string): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  body.append('model', GROQ_STT_MODEL);
  body.append('language', 'vi'); // hint Vietnamese; Groq auto-detects if wrong
  body.append('response_format', 'text');

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}` },
    body,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`[STT] Groq Whisper failed (${response.status}): ${errText}`);
  }

  // response_format=text returns plain text directly
  const transcript = await response.text();
  return transcript.trim();
}

/**
 * Rewrite raw transcript into a polished social post via Gemini.
 * Uses text-only tokens (cheap) — no audio involved here.
 */
async function rewriteWithGemini(inputText: string, geminiKey: string): Promise<string> {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${REWRITE_SYSTEM_PROMPT}\n\n---\nNỘI DUNG GỐC:\n${inputText}\n---`,
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.8 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`[STT] Gemini rewrite failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rewritten: string =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
  return rewritten.trim();
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const { unauthorized } = await requireUserWithRole([
      'admin',
      'marketer_full',
      'marketer_content',
    ]);
    if (unauthorized) return unauthorized;

    // 2. Check required API keys
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json(
        { error: 'Chưa cấu hình GROQ_API_KEY. Đăng ký miễn phí tại console.groq.com' },
        { status: 500 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'Chưa cấu hình GEMINI_API_KEY' }, { status: 500 });
    }

    // 3. Parse form
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Request phải là multipart/form-data' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const bullets = (formData.get('bullets') as string | null)?.trim() || '';

    if (!file && !bullets) {
      return NextResponse.json(
        { error: 'Vui lòng upload file âm thanh/video hoặc nhập nội dung ý chính' },
        { status: 400 }
      );
    }

    let transcript = '';

    // 4. STT via Groq Whisper (only when file is provided)
    if (file && file.size > 0) {
      if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Định dạng file không hỗ trợ: ${file.type}. Dùng MP3, MP4, M4A, WAV, hoặc WebM.` },
          { status: 400 }
        );
      }

      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        return NextResponse.json(
          { error: `File quá lớn (${fileSizeMB.toFixed(1)}MB). Tối đa ${MAX_FILE_SIZE_MB}MB.` },
          { status: 400 }
        );
      }

      console.log(`[STT] Groq Whisper processing: ${file.name} (${fileSizeMB.toFixed(2)}MB)`);
      transcript = await transcribeWithGroq(file, groqKey);
      console.log(`[STT] Transcript done: ${transcript.length} chars`);
    }

    // 5. Fallback: bullets only (no file)
    if (!transcript && bullets) {
      console.log('[STT] Bullet points only — skipping STT');
      transcript = bullets;
    }

    if (!transcript) {
      return NextResponse.json(
        { error: 'Không thể trích xuất nội dung. Hãy thử nhập ý chính thủ công.' },
        { status: 422 }
      );
    }

    // 6. Rewrite via Gemini (text only — không tốn audio tokens)
    const rewriteInput = bullets
      ? `${transcript}\n\nBổ sung ý chính từ người dùng:\n${bullets}`
      : transcript;

    const rewrittenPost = await rewriteWithGemini(rewriteInput, geminiKey);

    return NextResponse.json({ transcript, rewritten_post: rewrittenPost });
  } catch (error: any) {
    console.error('[STT API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi hệ thống khi xử lý giọng nói' },
      { status: 500 }
    );
  }
}
