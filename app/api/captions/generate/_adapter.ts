import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { ProductionArticleCrawler } from '@/backend/modules/caption-generation/article-crawler-adapter';
import { CaptionGenerationModule } from '@/backend/modules/caption-generation/caption-generation-module';
import { SupabaseCaptionGenerationRepository } from '@/backend/modules/caption-generation/caption-generation-repository';
import type {
  CaptionGenerationEvent,
  CaptionGenerationModuleInterface,
} from '@/backend/modules/caption-generation/caption-generation-types';
import { FileDefaultPromptSource } from '@/backend/modules/caption-generation/default-prompt-adapter';
import { CaptionGenerationError } from '@/backend/modules/caption-generation/errors';
import { GeminiCaptionAdapter } from '@/backend/modules/caption-generation/gemini-caption-adapter';

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function buildCaptionGenerationModule(
  userClient: SupabaseClient
): CaptionGenerationModuleInterface {
  return new CaptionGenerationModule(
    new SupabaseCaptionGenerationRepository(userClient, createServiceClient()),
    new ProductionArticleCrawler(),
    new GeminiCaptionAdapter(),
    new FileDefaultPromptSource()
  );
}

export function captionGenerationErrorResponse(error: unknown) {
  if (error instanceof CaptionGenerationError) {
    if (error.status === 500) {
      console.error('[Generate API] Error:', error.cause, error.context);
    }
    return NextResponse.json({ error: error.clientMessage }, { status: error.status });
  }

  console.error('[Generate API] Unexpected error:', error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Lỗi không xác định' },
    { status: 500 }
  );
}

export function encodeCaptionGenerationEvent(event: CaptionGenerationEvent) {
  if (event.type === 'text') return `data: ${JSON.stringify({ text: event.text })}\n\n`;
  if (event.type === 'validation-error') {
    return `data: ${JSON.stringify({ error: event.error, done: true })}\n\n`;
  }
  return `data: ${JSON.stringify({
    done: true,
    captionId: event.captionId,
    articleId: event.articleId,
    variantGroupId: event.variantGroupId,
  })}\n\n`;
}
