import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { classifyArticle } from '@/lib/services/articleClassifier';
import { suggestPrompts } from '@/lib/services/promptSuggestion';
import { PromptSuggestResponse } from '@/lib/types/api';

/**
 * GET /api/prompts/suggest
 *
 * T-1.19.3 – Trả về gợi ý prompt theo category của bài viết.
 *
 * Hỗ trợ 2 mode:
 *   1. ?article_id=<uuid>  → tra DB, cache kết quả AI vào articles.category
 *   2. ?title=&content=    → classify inline, không cache (dùng khi bài chưa lưu DB)
 *
 * Response: { articleCategory, confidence, suggestions, isFallback }
 * Fallback: nếu không match → top 3 prompt theo usage_count.
 */
export async function GET(request: NextRequest) {
  const { supabase, unauthorized } = await requireUserWithRole([
    'admin',
    'marketer_full',
    'marketer_content',
  ]);
  if (unauthorized) return unauthorized;

  const articleId = request.nextUrl.searchParams.get('article_id');
  const inlineTitle = request.nextUrl.searchParams.get('title');
  const inlineContent = request.nextUrl.searchParams.get('content');
  const platform = request.nextUrl.searchParams.get('platform');

  // ── Mode 1: article_id provided (DB lookup + cache) ──────────────────────
  if (articleId) {
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id, title, full_text, description, category, category_confidence')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      console.error('[GET /api/prompts/suggest] article not found:', articleError);
      return NextResponse.json(
        { error: 'Không tìm thấy bài viết' },
        { status: 404 }
      );
    }

    let categoryResult = {
      category: article.category as string,
      confidence: (article.category_confidence as number) ?? 0,
    };

    const isCached = !!article.category && !!article.category_confidence;

    if (!isCached) {
      const content = article.full_text || article.description || '';
      categoryResult = await classifyArticle(article.title ?? '', content);

      // Cache vào DB (không fail request nếu update lỗi)
      await supabase
        .from('articles')
        .update({
          category: categoryResult.category,
          category_confidence: categoryResult.confidence,
        })
        .eq('id', articleId);
    }

    const { suggestions, isFallback } = await suggestPrompts(supabase, categoryResult, 3, platform || undefined);
    const response: PromptSuggestResponse = {
      articleCategory: categoryResult.category,
      confidence: categoryResult.confidence,
      suggestions,
      isFallback,
    };
    return NextResponse.json(response);
  }

  // ── Mode 2: inline title + content (no DB, no cache) ─────────────────────
  if (inlineTitle || inlineContent) {
    const categoryResult = await classifyArticle(
      inlineTitle ?? '',
      inlineContent ?? ''
    );
    const { suggestions, isFallback } = await suggestPrompts(supabase, categoryResult, 3, platform || undefined);
    const response: PromptSuggestResponse = {
      articleCategory: categoryResult.category,
      confidence: categoryResult.confidence,
      suggestions,
      isFallback,
    };
    return NextResponse.json(response);
  }

  return NextResponse.json(
    { error: 'Thiếu tham số: cần article_id hoặc title/content' },
    { status: 400 }
  );
}
