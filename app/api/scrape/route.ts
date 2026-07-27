import { NextRequest, NextResponse } from 'next/server';
import { manualArticleSchema } from '@/backend/modules/article-ingestion/article-ingestion-schemas';
import { requireUserWithRole } from '@/lib/api/auth';
import { articleIngestionErrorResponse, buildArticleIngestionModule } from './_adapter';

const ARTICLE_INGESTION_ROLES = ['admin', 'marketer_full', 'marketer_content'] as const;

export async function GET(request: NextRequest) {
  try {
    const { unauthorized } = await requireUserWithRole([...ARTICLE_INGESTION_ROLES]);
    if (unauthorized) return unauthorized;
    const url = request.nextUrl.searchParams.get('url');
    if (!url) return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    return NextResponse.json(await buildArticleIngestionModule().ingestUrl(url));
  } catch (error) {
    return articleIngestionErrorResponse(error, '[Scrape API] Error:');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { unauthorized } = await requireUserWithRole([...ARTICLE_INGESTION_ROLES]);
    if (unauthorized) return unauthorized;
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 }); }
    const parsed = manualArticleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }
    return NextResponse.json(await buildArticleIngestionModule().createManual(parsed.data));
  } catch (error) {
    return articleIngestionErrorResponse(error, '[Scrape API POST] Error:');
  }
}
