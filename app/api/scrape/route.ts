import { NextRequest, NextResponse } from 'next/server';
import { crawlUrl, isSafeUrl } from '@/lib/crawler';
import { preprocessArticle } from '@/lib/crawler/preprocess';
import { createClient } from '@supabase/supabase-js';
import { requireUserWithRole } from '@/lib/api/auth';

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
  const { unauthorized } = await requireUserWithRole([
    'admin',
    'marketer_full',
    'marketer_content',
  ]);
  if (unauthorized) return unauthorized;

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

  // SSRF Validation
  const isSafe = await isSafeUrl(targetUrl);
  if (!isSafe) {
    return NextResponse.json({ error: 'Địa chỉ URL không được phép truy cập (SSRF Protection)' }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();

    // Luôn tiến hành cào mới
    console.log(`[Scrape API] Bypassing cache, starting crawl for: ${targetUrl}...`);
    const rawData = await crawlUrl(targetUrl);
    const cleanData = preprocessArticle(rawData);

    if (cleanData.type === 'LISTING') {
      return NextResponse.json({
        type: 'LISTING',
        url: cleanData.url,
        extractedUrls: cleanData.extractedUrls,
        warning: cleanData.warning
      });
    }

    const title = cleanData.title || '';
    const description = cleanData.description || '';
    const author = cleanData.author || '';

    // Gán category trực tiếp bằng cleanData.category (đảm bảo có dấu # nếu không rỗng)
    const category = cleanData.category
      ? (cleanData.category.startsWith('#') ? cleanData.category : `#${cleanData.category}`)
      : '';

    const imageUrl = cleanData.images.length > 0
      ? cleanData.images.map(img => img.url).join('\n')
      : '';
    const tagsString = cleanData.tags.join(', ');

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

    let articleId = '';

    if (existingArticle) {
      // Cập nhật bài viết hiện tại bằng dữ liệu mới cào
      console.log(`[Scrape API] Article already exists. Updating ID: ${existingArticle.id}`);
      const { data: updatedArticle, error: dbError } = await supabase
        .from('articles')
        .update({
          title,
          description,
          author,
          published_at: cleanData.published_at || '',
          views: cleanData.views || '',
          images: cleanData.images || [],
          body: cleanData.body || [],
          full_text: cleanData.full_text || description,
          category,
          tags: cleanData.tags && cleanData.tags.length > 0 ? cleanData.tags : [],
          crawled_at: new Date().toISOString(),
        })
        .eq('id', existingArticle.id)
        .select('id')
        .single();

      if (dbError) {
        console.error('[Scrape API] DB Update Error:', dbError);
      }
      articleId = updatedArticle?.id || existingArticle.id;
    } else {
      // Tạo mới bài viết trong database
      console.log(`[Scrape API] Article does not exist. Inserting new record...`);
      const { data: insertedArticle, error: dbError } = await supabase
        .from('articles')
        .insert({
          url: targetUrl,
          title,
          description,
          author,
          published_at: cleanData.published_at || '',
          views: cleanData.views || '',
          images: cleanData.images || [],
          body: cleanData.body || [],
          full_text: cleanData.full_text || description,
          category,
          tags: cleanData.tags && cleanData.tags.length > 0 ? cleanData.tags : [],
          crawled_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (dbError) {
        console.error('[Scrape API] DB Insert Error:', dbError);
      }
      articleId = insertedArticle?.id || '';
    }

    return NextResponse.json({
      id: articleId,
      title,
      description,
      full_text: cleanData.full_text || description,
      imageUrl,
      author,
      category,
      tags: tagsString,
      published_at: cleanData.published_at || '',
      views: cleanData.views || '',
      url: targetUrl,
      body: cleanData.body || [],
      author_image_url: cleanData.author_image_url || ''
    });
  } catch (error: any) {
    console.error(`[Scrape API] Error scraping ${targetUrl}:`, error);
    return NextResponse.json({ error: error.message || 'Lỗi cào dữ liệu' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, full_text, category, author, imageUrl } = await request.json();

    if (!title || !full_text) {
      return NextResponse.json({ error: 'Thiếu tiêu đề hoặc nội dung bài viết' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const mockUrl = `manual://article-${Date.now()}`;
    const cleanCategory = category ? (category.startsWith('#') ? category : `#${category}`) : '#Manual';

    const parsedImages = imageUrl
      ? imageUrl.split('\n').map((u: string) => u.trim()).filter(Boolean).map((url: string) => ({ url }))
      : [];

    const { data: insertedArticle, error: dbError } = await supabase
      .from('articles')
      .insert({
        url: mockUrl,
        title,
        description: full_text.length > 200 ? full_text.slice(0, 197) + '...' : full_text,
        author: author || 'AntBiz User',
        published_at: new Date().toISOString(),
        views: '0',
        images: parsedImages,
        body: [{ type: 'text', text: full_text }],
        full_text,
        category: cleanCategory,
        tags: ['manual'],
        crawled_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('[Scrape API POST] DB Insert Error:', dbError);
      return NextResponse.json({ error: 'Không thể lưu bài viết tự viết tay vào database' }, { status: 500 });
    }

    return NextResponse.json({
      id: insertedArticle?.id,
      title,
      description: full_text.length > 200 ? full_text.slice(0, 197) + '...' : full_text,
      full_text,
      author: author || 'AntBiz User',
      category: cleanCategory,
      tags: 'manual',
      published_at: new Date().toISOString(),
      views: '0',
      url: mockUrl,
      imageUrl: imageUrl || '',
      body: [{ type: 'paragraph', text: full_text }]
    });
  } catch (error: any) {
    console.error('[Scrape API POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
