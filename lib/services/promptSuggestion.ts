import { SupabaseClient } from '@supabase/supabase-js';
import { Prompt } from '@/lib/types/prompt';
import { CategoryResult } from '@/lib/types/article';
import { PromptSuggestion } from '@/lib/types/api';

/**
 * Map từ category sang keywords để match với prompt tags.
 * T-1.19.2: Thuật toán match prompt theo category.
 */
const CATEGORY_TAG_MAP: Record<string, string[]> = {
  'Bất động sản': ['bất động sản', 'nhà', 'đất', 'căn hộ', 'mua nhà', 'đầu tư', 'real estate'],
  'Tài chính': ['tài chính', 'tiết kiệm', 'ngân hàng', 'finance', 'money', 'đầu tư'],
  'Tổ ấm 4.0': ['gia đình', 'lifestyle', 'cuộc sống', 'tổ ấm', 'hành trình'],
  'Đầu tư': ['đầu tư', 'investment', 'lợi nhuận', 'tài chính', 'cổ phiếu', 'vàng'],
  'Cuộc sống': ['lifestyle', 'cuộc sống', 'chia sẻ', 'trải nghiệm'],
  'Kinh doanh': ['kinh doanh', 'business', 'startup', 'thương mại'],
  'Công nghệ': ['tech', 'công nghệ', 'ai', 'digital', 'software'],
  'Sức khỏe': ['sức khỏe', 'health', 'wellness', 'dinh dưỡng'],
  'Du lịch': ['du lịch', 'travel', 'khám phá', 'tour'],
  'Giáo dục': ['giáo dục', 'education', 'học', 'kỹ năng'],
};

/**
 * Tính relevance score cho một prompt dựa trên category.
 *
 * Công thức:
 *   score = (tagMatchCount / categoryKeywords.length) * 0.7
 *           + (tagMatchCount > 0 ? 0.2 : 0)          ← bonus nếu có bất kỳ tag match
 *           + (usageWeight * 0.1)                     ← usage_count normalized
 *
 * Trả về score trong [0, 1].
 */
export function computeRelevanceScore(
  prompt: Prompt & { usage_count?: number },
  categoryKeywords: string[],
  maxUsageCount: number
): number {
  if (categoryKeywords.length === 0) return 0;

  const promptTagsLower = prompt.tags.map((t) => t.toLowerCase());
  const keywordsLower = categoryKeywords.map((k) => k.toLowerCase());

  const matchedKeywords = keywordsLower.filter((kw) =>
    promptTagsLower.some((tag) => tag.includes(kw) || kw.includes(tag))
  );

  if (matchedKeywords.length === 0) return 0;

  const tagMatchScore = matchedKeywords.length / categoryKeywords.length;
  const hasAnyMatch = matchedKeywords.length > 0 ? 0.2 : 0;

  const usageNorm = maxUsageCount > 0
    ? ((prompt.usage_count ?? 0) / maxUsageCount)
    : 0;

  return Math.min(tagMatchScore * 0.7 + hasAnyMatch + usageNorm * 0.1, 1);
}

/**
 * T-1.19.2 + T-1.19.3 (fallback logic):
 *
 * 1. Lấy tất cả prompt active từ DB.
 * 2. Tính relevance score theo category.
 * 3. Trả về top N prompt theo score giảm dần.
 * 4. Fallback: nếu không có prompt nào score > 0, trả top 3 theo usage_count.
 */
export async function suggestPrompts(
  supabase: SupabaseClient,
  categoryResult: CategoryResult,
  limit = 3,
  platform?: string
): Promise<{ suggestions: PromptSuggestion[]; isFallback: boolean }> {
  const categoryKeywords = CATEGORY_TAG_MAP[categoryResult.category] ?? [];

  // Query tất cả prompt active (không bị xoá)
  let query = supabase
    .from('prompts')
    .select('*')
    .eq('is_deleted', false);
    
  // Lọc theo platform nếu có
  if (platform) {
    query = query.eq('platform', platform);
  }

  const { data: prompts, error } = await query;

  if (error || !prompts || prompts.length === 0) {
    console.error('[suggestPrompts] DB error or empty:', error);
    return { suggestions: [], isFallback: true };
  }

  const maxUsageCount = Math.max(...prompts.map((p: any) => p.usage_count ?? 0), 1);

  // Tính score cho từng prompt
  const scored = prompts.map((prompt: Prompt & { usage_count?: number }) => {
    const keywordsLower = categoryKeywords.map((k) => k.toLowerCase());
    const promptTagsLower = prompt.tags.map((t) => t.toLowerCase());

    const matchedTags = prompt.tags.filter((tag) =>
      keywordsLower.some((kw) => tag.toLowerCase().includes(kw) || kw.includes(tag.toLowerCase()))
    );

    return {
      prompt,
      relevanceScore: computeRelevanceScore(prompt, categoryKeywords, maxUsageCount),
      matchedTags,
    } as PromptSuggestion;
  });

  // Sort by relevance score DESC
  const ranked = scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Kiểm tra fallback: nếu top prompt vẫn score = 0
  const hasRelevantResults = ranked[0]?.relevanceScore > 0;

  if (!hasRelevantResults) {
    // Fallback: top N theo usage_count
    const fallback = [...prompts]
      .sort((a: any, b: any) => (b.usage_count ?? 0) - (a.usage_count ?? 0))
      .slice(0, limit)
      .map((prompt: Prompt & { usage_count?: number }) => ({
        prompt,
        relevanceScore: 0,
        matchedTags: [],
      }));

    return { suggestions: fallback, isFallback: true };
  }

  return { suggestions: ranked.slice(0, limit), isFallback: false };
}
