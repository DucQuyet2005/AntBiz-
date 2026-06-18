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
    console.log(`[Scrape API] Scraping with TS Playwright: ${targetUrl}`);
    const rawData = await crawlUrl(targetUrl);
    const cleanData = preprocessArticle(rawData);

    // T-1.19.1: Phân loại category bằng AI từ title + description
    // Không dùng URL includes() hay regex URL nữa.
    const { category: aiCategory, confidence } = await classifyArticle(title, description);
    const category = `#${aiCategory}`;
    const tags = '#Tiết kiệm tài chính, #Đầu tư, #Mua nhà';
    const imageUrl = cleanData.images.length > 0
      ? cleanData.images.map(img => img.url).join('\n')
      : '';
    const tagsString = cleanData.tags.join(', ');

    // T-1.19.1: Cache result in articles table
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = createClient();
    
    const { data: article, error: dbError } = await supabase
      .from('articles')
      .upsert({
        url: targetUrl,
        title,
        description,
        author,
        category: aiCategory,
        category_confidence: confidence,
        tags: tags.split(',').map(t => t.trim()),
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
      imageUrl,
      author,
      category,
      tags,
      title: cleanData.title || '',
      description: cleanData.description || '',
      imageUrl: imageUrl,
      author: cleanData.author || '',
      category: cleanData.category || '',
      tags: tagsString || '',
      published_at: cleanData.published_at || '',
      views: cleanData.views || '',
      url: targetUrl
    });
  } catch (error: any) {
    console.error(`[Scrape API] Error scraping ${targetUrl}:`, error);
    return NextResponse.json({ error: error.message || 'Lỗi cào dữ liệu' }, { status: 500 });
  }
}
