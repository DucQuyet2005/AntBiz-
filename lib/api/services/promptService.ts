import { SupabaseClient } from '@supabase/supabase-js';
import { Prompt } from '@/lib/types/prompt';

export interface PromptSuggestion extends Prompt {
  relevance_score: number;
}

/**
 * Suggests prompts based on article category and tags.
 */
export async function suggestPrompts(
  supabase: SupabaseClient,
  category: string,
  articleTags: string[] = []
): Promise<PromptSuggestion[]> {
  // 1. Fetch prompts that might be relevant
  // We'll search by tags that match the category or article tags
  const searchTags = [category.replace('#', ''), ...articleTags.map(t => t.replace('#', ''))];
  
  const { data: prompts, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('is_deleted', false);

  if (error || !prompts) {
    console.error('[suggestPrompts] fetch error:', error);
    return [];
  }

  // 2. Score prompts based on tag matches
  const scoredPrompts: PromptSuggestion[] = prompts.map(prompt => {
    let score = 0;
    
    // Exact category match in tags
    if (Array.isArray(prompt.tags) && (prompt.tags as string[]).some((tag: string) => tag.toLowerCase() === category.toLowerCase())) {
      score += 5;
    }
    
    // Partial tag matches
    searchTags.forEach(searchTag => {
      if (Array.isArray(prompt.tags) && (prompt.tags as string[]).some((pTag: string) => pTag.toLowerCase().includes(searchTag.toLowerCase()))) {
        score += 2;
      }
      if (prompt.content.toLowerCase().includes(searchTag.toLowerCase())) {
        score += 1;
      }
    });

    return {
      ...prompt,
      relevance_score: score
    };
  });

  // 3. Sort by score and return top 3
  const sorted = scoredPrompts
    .filter(p => p.relevance_score > 0)
    .sort((a, b) => b.relevance_score - a.relevance_score);

  if (sorted.length > 0) {
    return sorted.slice(0, 3);
  }

  // 4. Fallback: Top 3 most recently updated prompts
  return prompts
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3)
    .map(p => ({ ...p, relevance_score: 0 }));
}
