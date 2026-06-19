import { NextRequest, NextResponse } from 'next/server';
import { classifyArticle } from '@/lib/services/articleClassifier';
import { crawlUrl } from '@/lib/crawler';
import { preprocessArticle } from '@/lib/crawler/preprocess';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Validate URL to prevent security issues
  try {
    new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  try {
    // T-1.19.1: Check if URL already exists in database first
    const { createAdminClient } = await import('@/utils/supabase/admin');
    const supabase = createAdminClient();

    console.log(`[Scrape API] Checking cache for: ${targetUrl}`);
    const { data: existingArticle, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('url', targetUrl)
      .single();

    if (existingArticle && !fetchError) {
      console.log(`[Scrape API] Cache HIT for: ${targetUrl}`);
      // Return cached data immediately
      const imageUrl = Array.isArray(existingArticle.images) 
        ? existingArticle.images.map((img: any) => img.url).join('\n')
        : '';
      const tagsString = Array.isArray(existingArticle.tags)
        ? existingArticle.tags.join(', ')
        : '';

      return NextResponse.json({
        id: existingArticle.id,
        title: existingArticle.title,
        description: existingArticle.description,
        full_text: existingArticle.full_text || existingArticle.description || '',
        imageUrl,
        author: existingArticle.author,
        category: existingArticle.category,
        tags: tagsString,
        published_at: existingArticle.published_at || '',
        views: existingArticle.views || '',
        url: existingArticle.url
      });
    }

    console.log(`[Scrape API] Cache MISS for: ${targetUrl}. Starting crawl...`);
    const rawData = await crawlUrl(targetUrl);
    const cleanData = preprocessArticle(rawData);

    const title = cleanData.title || '';
    const description = cleanData.description || '';
    const author = cleanData.author || '';

    // Ưu tiên danh mục từ HTML crawl (ví dụ: "#Xã hội số").
    // T-1.19.1: Chỉ dùng danh mục từ HTML crawl, không fallback AI để tránh sai lệch dữ liệu.
    const crawledCategory = cleanData.category || '';
    let savedCategory = crawledCategory; // đã có dấu # từ crawler hoặc chuỗi rỗng
    let confidence = crawledCategory ? 1.0 : 0.0;

    const imageUrl = cleanData.images.length > 0
      ? cleanData.images.map(img => img.url).join('\n')
      : '';
    // Dùng tags từ HTML crawl, không hardcode
    const tagsString = cleanData.tags.join(', ');

    // T-1.19.1: Cache result in articles table
    const { data: article, error: dbError } = await supabase
      .from('articles')
      .upsert({
        url: targetUrl,
        title,
        description,
        author,
        // Lưu category với dấu # (ví dụ: "#Xã hội số" hoặc "#Kinh doanh")
        category: savedCategory,
        category_confidence: confidence,
        // Dùng tags từ HTML, không hardcode
        tags: cleanData.tags && cleanData.tags.length > 0 ? cleanData.tags : [],
        images: cleanData.images || [],
        body: cleanData.body || [],
        full_text: cleanData.full_text || '',
        published_at: cleanData.published_at || '',
        views: cleanData.views || '',
        crawled_at: new Date().toISOString(),
      }, { onConflict: 'url' })
      .select('id')
      .single();

    if (dbError) {
      console.error('[scrape API] DB Error:', dbError);
    }

    return NextResponse.json({
      id: article?.id, // T-1.19.3: Trả về ID để dùng cho prompt suggestions
      title,
      description,
      full_text: cleanData.full_text || '', // Trả về nội dung đầy đủ
      imageUrl,
      author,
      category: savedCategory,
      tags: tagsString,
      published_at: cleanData.published_at || '',
      views: cleanData.views || '',
      url: targetUrl
    });
  } catch (error: any) {
    console.error(`[Scrape API] Error scraping ${targetUrl}:`, error);
    return NextResponse.json({ error: error.message || 'Lỗi cào dữ liệu' }, { status: 500 });
  }
}
