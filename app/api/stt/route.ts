import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';

// VPS production config: cho phép route chạy tối đa 120 giây
// (Groq Whisper ~10s + 2x Gemini calls ~10s mỗi cái + retry buffer)
export const maxDuration = 120;

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

const CORRECT_PROMPT = `Bạn là công cụ hiệu đính văn bản thuần túy. Nhiệm vụ DUY NHẤT của bạn là:
1. Sửa lỗi CHÍNH TẢ tiếng Việt (dấu thanh sai, phụ âm sai, từ viết sai)
2. Thêm DẤU CÂU đúng chỗ (dấu phẩy, dấu chấm, dấu hỏi)
3. Xóa TỪ ĐỆM vô nghĩa ("ừm", "à", "ờ", "thì là", từ bị nói lắp)

QUY TẮC TUYỆT ĐỐI — VI PHẠM LÀ SAI:
- KHÔNG thay đổi từ ngữ, cách diễn đạt, cấu trúc câu của người nói
- KHÔNG thêm bất kỳ từ, câu, ý tưởng mới nào
- KHÔNG rút gọn hoặc tóm tắt nội dung
- KHÔNG viết lại văn phong hay làm câu "hay hơn"
- KHÔNG thay thế từ của người nói bằng từ đồng nghĩa khác
- Đầu ra phải phản ánh CHÍNH XÁC những gì người nói đã nói

CHỈ TRẢ VỀ VĂN BẢN SAU KHI HIỆU ĐÍNH. KHÔNG có lời dẫn, không giải thích.`;

const TITLE_PROMPT = `Bạn là một tiêu đề editor chuyên nghiệp.
Dưới đây là nội dung một bài viết. Hãy sinh ra một tiêu đề ngắn gọn, sút tích và lôi cuốn cho bài viết đó.
Yêu cầu:
- Tối đa 12 từ
- Không có dấu nọm kép, không có tiền tố như "Tiêu đề:", "Bài viết:"
- Ngôn ngữ phù hợp với nội dung (tiếng Việt nếu nội dung tiếng Việt)
- Phản ánh đúng chủ đề chính

CHỈ TRẢ VỀ DUY NHẤT TIÊU ĐỀ. KHÔNG giải thích gì thêm.`;

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

/** Delay helper for retry backoff */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Retryable status codes — transient server errors ONLY, NOT quota errors */
const RETRYABLE_STATUS = new Set([503, 502, 504]); // 429 = quota exhausted, never retry
const MAX_RETRIES = 2;        // chỉ 2 lần — ít hơn để tránh timeout trên VPS
const BASE_DELAY_MS = 500;    // 500ms → 1s (giảm xuống từ 1s → 2s)
const GEMINI_TIMEOUT_MS = 25_000; // 25s per Gemini call (VPS network SLA)

/** Parse Gemini retryDelay from a 429 error body, return seconds or null */
function parseRetryDelay(errText: string): number | null {
  try {
    const body = JSON.parse(errText);
    const details: any[] = body?.error?.details ?? [];
    for (const d of details) {
      if (d['@type']?.includes('RetryInfo') && d.retryDelay) {
        const match = String(d.retryDelay).match(/(\d+)/);
        if (match) return parseInt(match[1], 10);
      }
    }
  } catch { /* ignore */ }
  return null;
}

/** Shared helper: one Gemini text-in, text-out call with exponential backoff retry */
async function callGemini(
  prompt: string,
  inputText: string,
  geminiKey: string,
  temperature = 0.2,
  label = 'Gemini'
): Promise<string> {
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const modelsToTry = [
    primaryModel,
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-lite'
  ].filter((val, index, self) => self.indexOf(val) === index);

  let lastError = '';
  for (const modelName of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
    const body = JSON.stringify({
      contents: [{ parts: [{ text: `${prompt}\n\n---\n${inputText}\n---` }] }],
      generationConfig: { temperature },
    });

    let modelSuccess = false;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr?.name === 'AbortError') {
          console.warn(`[STT] ${label} (${modelName}) timed out after ${GEMINI_TIMEOUT_MS / 1000}s`);
          break; // Try next model
        }
        throw fetchErr;
      }
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const text: string =
          data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
        return text.trim();
      }

      const errText = await response.text();
      lastError = errText;

      if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1); // 500ms, 1s
        console.warn(`[STT] ${label} (${modelName}) got ${response.status}, retry ${attempt}/${MAX_RETRIES - 1} in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // If rate limited or quota exceeded, break the attempt loop to try the next model
      if (response.status === 429 || errText.includes('quota') || errText.includes('Quota')) {
        console.warn(`[STT] ${label} (${modelName}) rate limited (429/quota). Trying fallback...`);
        break;
      }

      // Other non-retryable errors — throw so caller can fail
      throw new Error(`[STT] ${label} (${modelName}) failed (${response.status}): ${lastError}`);
    }
  }

  throw new Error(`[STT] ${label} failed all models. Last error: ${lastError}`);
}

/**
 * Correct spelling, punctuation and filler words in raw transcript via Gemini.
 */
async function correctWithGemini(inputText: string, geminiKey: string): Promise<string> {
  return callGemini(
    `${CORRECT_PROMPT}\n\nVĂN BẢN GỐC:`,
    inputText,
    geminiKey,
    0.2,
    'Correction'
  );
}

/**
 * Generate a short, catchy title from the corrected text via Gemini.
 */
async function generateTitleWithGemini(inputText: string, geminiKey: string): Promise<string> {
  return callGemini(
    `${TITLE_PROMPT}\n\nNỘI DUNG:`,
    inputText,
    geminiKey,
    0.7,
    'TitleGen'
  );
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
      const isAllowedType = ALLOWED_AUDIO_TYPES.includes(file.type) || 
                            file.type.startsWith('audio/webm') || 
                            file.type.startsWith('audio/ogg') ||
                            file.type.startsWith('audio/mpeg') ||
                            file.type.startsWith('audio/wav') ||
                            file.type.startsWith('audio/mp3') ||
                            file.type.startsWith('audio/m4a') ||
                            file.type.startsWith('audio/x-m4a');
      if (!isAllowedType) {
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

    // 6. Correct spelling/punctuation + generate title via Gemini — run in parallel
    //    Use allSettled so one failure doesn't abort the other
    // IMPORTANT: correctWithGemini only receives the raw STT transcript so it
    // doesn't synthesize new content by mixing transcript + bullet notes.
    // generateTitleWithGemini may use bullets (if provided) as extra context.
    const titleInput = bullets ? `${transcript}\n\n${bullets}` : transcript;

    const [correctionResult, titleResult] = await Promise.allSettled([
      correctWithGemini(transcript, geminiKey),
      generateTitleWithGemini(titleInput, geminiKey),
    ]);

    const correctedTranscript =
      correctionResult.status === 'fulfilled'
        ? correctionResult.value
        : (console.warn('[STT] Correction unavailable, using raw transcript:', (correctionResult as PromiseRejectedResult).reason?.message), transcript);

    const generatedTitle =
      titleResult.status === 'fulfilled'
        ? titleResult.value
        : (console.warn('[STT] Title generation unavailable:', (titleResult as PromiseRejectedResult).reason?.message), '');

    if (generatedTitle) console.log(`[STT] Generated title: "${generatedTitle}"`);

    return NextResponse.json({
      transcript,
      rewritten_post: correctedTranscript,
      generated_title: generatedTitle,
    });
  } catch (error: any) {
    console.error('[STT API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi hệ thống khi xử lý giọng nói' },
      { status: 500 }
    );
  }
}
