import { CategoryResult } from '@/lib/types/article';

/**
 * Danh sách category hợp lệ của hệ thống.
 * Dùng để giới hạn kết quả AI trả về.
 */
const VALID_CATEGORIES = [
  'Bất động sản',
  'Tài chính',
  'Tổ ấm 4.0',
  'Đầu tư',
  'Cuộc sống',
  'Kinh doanh',
  'Công nghệ',
  'Sức khỏe',
  'Du lịch',
  'Giáo dục',
] as const;

type ValidCategory = (typeof VALID_CATEGORIES)[number];

/**
 * Keyword fallback khi không có AI API key.
 * Đây là safety net, không phải logic chính.
 */
function fallbackClassify(title: string, content: string): CategoryResult {
  const text = `${title} ${content}`.toLowerCase();

  const keywordMap: Record<ValidCategory, string[]> = {
    'Bất động sản': ['nhà', 'đất', 'căn hộ', 'bất động sản', 'chung cư', 'mua nhà', 'thuê nhà', 'đất nền'],
    'Tài chính': ['tài chính', 'lãi suất', 'ngân hàng', 'tiết kiệm', 'vốn', 'quỹ', 'chứng khoán'],
    'Tổ ấm 4.0': ['gia đình', 'tổ ấm', 'cuộc sống', 'hành trình', 'thế hệ', 'ở trọ', 'vợ chồng'],
    'Đầu tư': ['đầu tư', 'lợi nhuận', 'cổ phiếu', 'crypto', 'vàng', 'tích lũy', 'rủi ro'],
    'Cuộc sống': ['cuộc sống', 'trải nghiệm', 'câu chuyện', 'chia sẻ', 'hạnh phúc'],
    'Kinh doanh': ['kinh doanh', 'doanh nghiệp', 'startup', 'thương mại', 'bán hàng'],
    'Công nghệ': ['công nghệ', 'ai', 'app', 'phần mềm', 'digital', 'tech'],
    'Sức khỏe': ['sức khỏe', 'y tế', 'bệnh', 'dinh dưỡng', 'thể thao'],
    'Du lịch': ['du lịch', 'khám phá', 'resort', 'điểm đến', 'tour'],
    'Giáo dục': ['giáo dục', 'học', 'trường', 'sinh viên', 'kỹ năng'],
  };

  let bestCategory: ValidCategory = 'Cuộc sống';
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(keywordMap) as [ValidCategory, string[]][]) {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  return {
    category: bestCategory,
    confidence: bestScore > 0 ? Math.min(0.5 + bestScore * 0.08, 0.85) : 0.3,
  };
}

/**
 * Phân loại nội dung bài viết bằng Gemini API.
 * Nếu GEMINI_API_KEY chưa có, fallback về keyword matching.
 *
 * T-1.19.1: Không dùng includes() hoặc regex URL để phân loại.
 * Đầu vào: title + content
 * Đầu ra: { category, confidence }
 */
export async function classifyArticle(
  title: string,
  content: string
): Promise<CategoryResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    // Fallback: keyword-based (vẫn tốt hơn regex URL)
    console.warn('[classifyArticle] GEMINI_API_KEY not set, using keyword fallback');
    return fallbackClassify(title, content);
  }

  const prompt = `Bạn là chuyên gia phân loại nội dung truyền thông.
Phân tích bài viết sau và chọn ĐÚNG MỘT category phù hợp nhất từ danh sách.

Danh sách category: ${VALID_CATEGORIES.join(', ')}

Tiêu đề: ${title}
Nội dung (tóm tắt): ${content.substring(0, 800)}

Trả về JSON với format chính xác (không có markdown):
{"category":"<tên category>","confidence":<số từ 0.0 đến 1.0>}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 100,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      console.error('[classifyArticle] Gemini API error:', res.status);
      return fallbackClassify(title, content);
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Strip markdown code fences nếu Gemini trả về ```json ... ```
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

    let parsed: { category: string; confidence: number };
    try {
      parsed = JSON.parse(cleaned) as { category: string; confidence: number };
    } catch {
      console.warn('[classifyArticle] Gemini không trả về JSON hợp lệ, dùng fallback. Raw:', text.substring(0, 100));
      return fallbackClassify(title, content);
    }

    // Validate category nằm trong danh sách hợp lệ
    const validCategory = VALID_CATEGORIES.includes(parsed.category as ValidCategory)
      ? parsed.category
      : fallbackClassify(title, content).category;

    return {
      category: validCategory,
      confidence: typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.7,
    };
  } catch (err) {
    console.error('[classifyArticle] error:', err);
    return fallbackClassify(title, content);
  }
}
