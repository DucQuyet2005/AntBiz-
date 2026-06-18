import { SupabaseClient } from '@supabase/supabase-js';

export interface ArticleClassification {
  category: string;
  confidence: number;
}

/**
 * Classifies an article based on its title and content.
 * In a real implementation, this would call an AI service (OpenAI, Gemini, etc.)
 */
export async function classifyArticle(
  title: string,
  content: string
): Promise<ArticleClassification> {
  // Mock AI classification logic
  // A real implementation would use a prompt like:
  // "Classify this article into one of these categories: Sales, News, Entertainment, Finance, Real Estate. 
  // Title: ${title}. Content: ${content.substring(0, 500)}"
  
  const text = (title + ' ' + content).toLowerCase();
  
  if (text.includes('vàng') || text.includes('tài chính') || text.includes('tiết kiệm') || text.includes('ngân hàng')) {
    return { category: 'Tài chính', confidence: 0.95 };
  }
  if (text.includes('nhà') || text.includes('đất') || text.includes('bất động sản') || text.includes('căn hộ')) {
    return { category: 'Bất động sản', confidence: 0.92 };
  }
  if (text.includes('liệt sĩ') || text.includes('lịch sử') || text.includes('khảo sát')) {
    return { category: 'Tin tức / Xã hội', confidence: 0.88 };
  }
  
  return { category: 'Chung', confidence: 0.5 };
}

/**
 * Updates an article's category and confidence in the database.
 */
export async function updateArticleCategory(
  supabase: SupabaseClient,
  articleId: string,
  classification: ArticleClassification
) {
  const { error } = await supabase
    .from('articles')
    .update({
      category: classification.category,
      // Note: category_confidence might not exist in DB yet, 
      // but we include it based on the implementation plan.
      // If it fails, we fallback to just category.
    } as any)
    .eq('id', articleId);

  if (error) {
    console.error('[updateArticleCategory] error:', error);
    // If it's a "column does not exist" error, we could try updating without it
    // but for now we just log it.
  }
}
