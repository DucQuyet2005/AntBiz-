import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { executeWithRotation } from '@/lib/services/geminiRotationManager';

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

const METADATA_PROMPT = `Bạn là một biên tập viên nội dung chuyên nghiệp.
Dưới đây là nội dung một bài viết. Hãy phân tích nội dung và sinh ra các thông tin sau dưới dạng JSON object hợp lệ:
{
  "title": "tiêu đề ngắn gọn, súc tích và lôi cuốn (dưới 12 từ)",
  "category": "danh mục/chuyên mục ngắn gọn phù hợp nhất (ví dụ: Âm nhạc, Lịch sử, Thể thao, Công nghệ, Kinh doanh, Đời sống...)",
  "tags": "3-5 từ khóa/hashtag liên quan nhất, phân tách bằng dấu phẩy"
}

Yêu cầu:
- Trả về DUY NHẤT một chuỗi JSON hợp lệ. KHÔNG giải thích, không thêm ký tự markdown hay lời dẫn.`;

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

/** Shared helper: one Gemini text-in, text-out call using the key rotation manager and official SDK */
async function callGemini(
  prompt: string,
  inputText: string,
  temperature = 0.2,
  label = 'Gemini'
): Promise<string> {
  const result = await executeWithRotation(
    { title: label, content: inputText },
    async (key, modelName) => {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature }
      });
      const response = await model.generateContent(`${prompt}\n\n---\n${inputText}\n---`);
      return response.response.text();
    }
  );
  return result.trim();
}

/**
 * Correct spelling, punctuation and filler words in raw transcript via Gemini.
 */
async function correctWithGemini(inputText: string): Promise<string> {
  return callGemini(
    `${CORRECT_PROMPT}\n\nVĂN BẢN GỐC:`,
    inputText,
    0.2,
    'Correction'
  );
}

/**
 * Generate a short, catchy title, category, and tags from the corrected text via Gemini.
 */
async function generateMetadataWithGemini(inputText: string): Promise<{ title: string; category: string; tags: string }> {
  let rawJson = '';
  try {
    rawJson = await callGemini(
      `${METADATA_PROMPT}\n\nNỘI DUNG:`,
      inputText,
      0.7,
      'MetadataGen'
    );
    // Parse JSON safely
    const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return {
      title: (parsed.title || '').trim(),
      category: (parsed.category || '').trim(),
      tags: (parsed.tags || '').trim()
    };
  } catch (e) {
    console.warn('[STT] Failed to parse metadata JSON, using raw string as title:', e);
    return {
      title: rawJson.trim(),
      category: '',
      tags: ''
    };
  }
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

    // 3. Parse form
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (err: any) {
      console.error('[STT API] formData parse error:', err);
      return NextResponse.json({ 
        error: `Không thể đọc dữ liệu yêu cầu: ${err.message || 'Yêu cầu phải là dữ liệu multipart/form-data hoặc tệp tin quá lớn'}` 
      }, { status: 400 });
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

      // Kiểm tra nhiễu hoặc im lặng (Whisper thường hallucinate ra các câu lặp lại)
      const norm = transcript.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
      const isHallucination = [
        'ghiền mì gõ',
        'ghien mi go',
        'hãy đăng ký kênh',
        'hãy đăng ký',
        'đăng ký kênh',
        'subscribe',
        'cám ơn các bạn',
        'cảm ơn các bạn',
        'cám ơn',
        'cảm ơn',
        'tạm biệt',
        'xin chào'
      ].some(h => norm === h || norm.includes(h)) && norm.length < 50;

      if (isHallucination || transcript.trim().length < 5) {
        return NextResponse.json(
          { error: 'Không nhận dạng được giọng nói rõ ràng. Vui lòng nói to/rõ hơn hoặc soạn thảo thủ công.' },
          { status: 422 }
        );
      }
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

    // 6. Correct spelling/punctuation + generate title/category/tags via Gemini — run in parallel
    //    Use allSettled so one failure doesn't abort the other
    // IMPORTANT: correctWithGemini only receives the raw STT transcript so it
    // doesn't synthesize new content by mixing transcript + bullet notes.
    // generateMetadataWithGemini may use bullets (if provided) as extra context.
    const titleInput = bullets ? `${transcript}\n\n${bullets}` : transcript;

    const [correctionResult, metadataResult] = await Promise.allSettled([
      correctWithGemini(transcript),
      generateMetadataWithGemini(titleInput),
    ]);

    const correctedTranscript =
      correctionResult.status === 'fulfilled'
        ? correctionResult.value
        : (console.warn('[STT] Correction unavailable, using raw transcript:', (correctionResult as PromiseRejectedResult).reason?.message), transcript);

    const generatedMetadata =
      metadataResult.status === 'fulfilled'
        ? metadataResult.value
        : { title: '', category: '', tags: '' };

    if (generatedMetadata.title) console.log(`[STT] Generated title: "${generatedMetadata.title}"`);

    return NextResponse.json({
      transcript,
      rewritten_post: correctedTranscript,
      generated_title: generatedMetadata.title,
      generated_category: generatedMetadata.category,
      generated_tags: generatedMetadata.tags,
    });
  } catch (error: any) {
    console.error('[STT API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi hệ thống khi xử lý giọng nói' },
      { status: 500 }
    );
  }
}
