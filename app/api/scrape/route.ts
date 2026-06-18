import { NextRequest, NextResponse } from 'next/server';
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

    const imageUrl = cleanData.images.length > 0
      ? cleanData.images.map(img => img.url).join('\n')
      : '';
    const tagsString = cleanData.tags.join(', ');

    return NextResponse.json({
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
