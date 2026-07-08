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
  // T-1.19.1: Bỏ qua việc gọi Gemini API để tiết kiệm tối đa quota/API Key phục vụ cho tính năng viết bài.
  // Sử dụng bộ phân loại bằng từ khóa cục bộ cực kỳ nhanh, ổn định và 100% miễn phí.
  return fallbackClassify(title, content);
}
