import { NextRequest, NextResponse } from 'next/server';
import { classifyArticle } from '@/lib/services/articleClassifier';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch: ${res.statusText}` }, { status: res.status });
    }

    const html = await res.text();

    // Parse Open Graph and standard meta tags using regex
    const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) ||
                       html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i) ||
                       html.match(/<title>([^<]*)<\/title>/i);
    
    const descMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i) ||
                      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
                      
    const imgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
    
    const authorMatch = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']*)["']/i) ||
                        html.match(/<span[^>]*class=["'][^"']*author[^"']*["'][^>]*>([^<]*)<\/span>/i);

    const title = titleMatch ? titleMatch[1].trim() : 'Góc Nhìn Mới Article';
    const description = descMatch ? descMatch[1].trim() : 'Không có mô tả.';
    const imageUrl = imgMatch ? imgMatch[1].trim() : 'https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?w=800&q=80';
    const author = authorMatch ? authorMatch[1].trim() : 'Ban Biên Tập';

    // T-1.19.1: Phân loại category bằng AI từ title + description
    // Không dùng URL includes() hay regex URL nữa.
    const { category: aiCategory, confidence } = await classifyArticle(title, description);
    const category = `#${aiCategory}`;
    const tags = '#Tiết kiệm tài chính, #Đầu tư, #Mua nhà';

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
      url: targetUrl
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
