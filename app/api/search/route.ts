import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { translations } from '@/lib/i18n/translations';

function searchFaq(q: string, lang: 'vi' | 'en' = 'vi') {
  const faqData = translations[lang]?.faq?.categories;
  if (!faqData) return [];

  const results: any[] = [];
  const categories = ['harvesting', 'aiPrompts', 'scheduling', 'customization'];

  for (const cat of categories) {
    const catData = (faqData as any)[cat];
    if (!catData) continue;

    // A category has title, and questions q1..q5, a1..a5
    for (let i = 1; i <= 5; i++) {
      const question = catData[`q${i}`];
      const answer = catData[`a${i}`];
      if (question && answer) {
        if (
          question.toLowerCase().includes(q.toLowerCase()) ||
          answer.toLowerCase().includes(q.toLowerCase())
        ) {
          results.push({
            key: `${cat}_${i}`,
            category: cat,
            question,
            answer,
          });
        }
      }
    }
  }
  return results;
}

export async function GET(request: NextRequest) {
  // 1. Authenticate user and verify role
  const { user, role, supabase, unauthorized } = await requireUserWithRole([
    'admin',
    'marketer_full',
    'marketer_content',
  ]);
  if (unauthorized) return unauthorized;

  // 2. Parse query search parameter and lang
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q')?.trim() ?? '';
  const lang = (searchParams.get('lang') as 'vi' | 'en') || 'vi';

  if (!q) {
    return NextResponse.json(
      { error: 'Từ khóa tìm kiếm không hợp lệ' },
      { status: 400 }
    );
  }

  try {
    // 3. Execute searches in parallel to minimize latency
    const articlesPromise = supabase
      .from('articles')
      .select('id, title, description, crawled_at')
      .or(`title.ilike.%${q}%,description.ilike.%${q}%,full_text.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    const captionsPromise = supabase
      .from('captions')
      .select('id, platform, ai_content, edited_content, article_id, articles(id, title)')
      .or(`edited_content.ilike.%${q}%,ai_content.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    let promptsQuery = supabase
      .from('prompts')
      .select('id, name, content, platform, tags, created_by')
      .eq('is_deleted', false)
      .or(`name.ilike.%${q}%,content.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    // Apply security check: non-admins can only see their own prompts
    if (role !== 'admin' && user) {
      promptsQuery = promptsQuery.eq('created_by', user.id);
    }

    const [articlesResult, captionsResult, promptsResult] = await Promise.all([
      articlesPromise,
      captionsPromise,
      promptsQuery,
    ]);

    // Handle database query errors
    if (articlesResult.error) {
      console.error('[GET /api/search] articles query error:', articlesResult.error);
      throw articlesResult.error;
    }
    if (captionsResult.error) {
      console.error('[GET /api/search] captions query error:', captionsResult.error);
      throw captionsResult.error;
    }
    if (promptsResult.error) {
      console.error('[GET /api/search] prompts query error:', promptsResult.error);
      throw promptsResult.error;
    }

    // Search FAQs in memory
    const faqs = searchFaq(q, lang);

    // 4. Return combined results
    return NextResponse.json({
      articles: articlesResult.data || [],
      captions: captionsResult.data || [],
      prompts: promptsResult.data || [],
      faqs,
    });
  } catch (err: any) {
    console.error('[GET /api/search] search API error:', err);
    return NextResponse.json(
      { error: 'Không thể thực hiện tìm kiếm toàn cục' },
      { status: 500 }
    );
  }
}
