import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { ArticleIngestionModule } from '@/backend/modules/article-ingestion/article-ingestion-module';
import { SupabaseArticleIngestionRepository } from '@/backend/modules/article-ingestion/article-ingestion-repository';
import { ProductionArticleSource } from '@/backend/modules/article-ingestion/article-source-adapter';
import { ArticleIngestionError } from '@/backend/modules/article-ingestion/errors';

export function buildArticleIngestionModule() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return new ArticleIngestionModule(
    new ProductionArticleSource(),
    new SupabaseArticleIngestionRepository(supabase)
  );
}

export function articleIngestionErrorResponse(error: unknown, logLabel: string) {
  if (error instanceof ArticleIngestionError) {
    if (error.status === 500) console.error(logLabel, error.cause);
    return NextResponse.json({ error: error.clientMessage }, { status: error.status });
  }
  console.error(logLabel, error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Lỗi hệ thống' },
    { status: 500 }
  );
}
