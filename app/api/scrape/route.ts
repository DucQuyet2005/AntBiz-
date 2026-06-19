import { NextRequest, NextResponse } from 'next/server';
import { classifyArticle } from '@/lib/services/articleClassifier';
import { crawlUrl } from '@/lib/crawler';
import { preprocessArticle } from '@/lib/crawler/preprocess';
import { createClient } from '@supabase/supabase-js';

// Khởi tạo client Supabase quyền Admin (Service Role) để bypass RLS trên bảng articles
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  console.log('[Scrape API - Supabase Client Init]:', {
    hasUrl: !!supabaseUrl,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    fallbackToAnonKey: !process.env.SUPABASE_SERVICE_ROLE_KEY && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

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
    const supabase = createServiceClient();

    // 1. Kiểm tra xem URL này đã có trong database chưa (tìm khớp chính xác)
    let { data: existingArticle, error: findError } = await supabase
      .from('articles')
      .select('*')
      .eq('url', targetUrl)
      .maybeSingle();

    // 2. Nếu không khớp chính xác, thử tìm khớp theo tiền tố (đề phòng người dùng nhập URL thiếu ID ở đuôi)
    if (!existingArticle) {
      const { data: prefixMatch } = await supabase
        .from('articles')
        .select('*')
        .ilike('url', `${targetUrl}%`)
        .order('crawled_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      existingArticle = prefixMatch;
    }

    if (existingArticle && existingArticle.title) {
      console.log(`[Scrape API] Found cached article in DB: ${existingArticle.url}`);
      
      let imageUrl = '';
      if (Array.isArray(existingArticle.images)) {
        imageUrl = existingArticle.images.map((img: any) => img.url).join('\n');
      } else if (existingArticle.images && typeof existingArticle.images === 'object') {
        imageUrl = (existingArticle.images as any).url || '';
      }

      return NextResponse.json({
        id: existingArticle.id,
        title: existingArticle.title,
        description: existingArticle.description || '',
        imageUrl: imageUrl,
        author: existingArticle.author || '',
        category: `#${existingArticle.category || 'Chung'}`,
        tags: existingArticle.tags?.join(', ') || '',
        published_at: existingArticle.published_at || '',
        views: existingArticle.views || '',
        url: existingArticle.url
      });
    }

    // 3. Nếu chưa có trong DB, tiến hành cào mới
    console.log(`[Scrape API] Scraping article: ${targetUrl}`);
    const rawData = await crawlUrl(targetUrl);
    const cleanData = preprocessArticle(rawData);

    const title = cleanData.title || '';
    const description = cleanData.description || '';
    const author = cleanData.author || '';

    // T-1.19.1: Phân loại category bằng AI từ title + description
    const { category: aiCategory, confidence } = await classifyArticle(title, description);
    const category = `#${aiCategory}`;
    const tags = '#Tiết kiệm tài chính, #Đầu tư, #Mua nhà';
    const imageUrl = cleanData.images.length > 0
      ? cleanData.images.map(img => img.url).join('\n')
      : '';
    const tagsString = cleanData.tags.join(', ');

    // Lưu bài viết mới vào database bằng admin client
    const { data: article, error: dbError } = await supabase
      .from('articles')
      .upsert({
        url: targetUrl,
        title,
        description,
        author,
        published_at: cleanData.published_at || '',
        views: cleanData.views || '',
        images: cleanData.images || [],
        body: cleanData.body || [],
        full_text: cleanData.full_text || description,
        category: aiCategory,
        category_confidence: confidence,
        tags: cleanData.tags.length > 0 ? cleanData.tags : tags.split(',').map(t => t.trim()),
        crawled_at: new Date().toISOString(),
      }, { onConflict: 'url' })
      .select('id')
      .single();

    if (dbError) {
      console.error('[scrape API] DB Error:', dbError);
    }

    return NextResponse.json({
      id: article?.id,
      title,
      description,
      imageUrl,
      author,
      category,
      tags: tagsString || tags,
      published_at: cleanData.published_at || '',
      views: cleanData.views || '',
      url: targetUrl
    });
  } catch (error: any) {
    console.error(`[Scrape API] Error scraping ${targetUrl}:`, error);
    return NextResponse.json({ error: error.message || 'Lỗi cào dữ liệu' }, { status: 500 });
  }
}
