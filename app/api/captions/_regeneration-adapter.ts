import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SupabaseCaptionGenerationRepository } from '@/backend/modules/caption-generation/caption-generation-repository';
import { GeminiCaptionAdapter } from '@/backend/modules/caption-generation/gemini-caption-adapter';
import { GeminiCaptionTextRegenerator } from '@/backend/modules/caption-generation/caption-text-regenerator';
import { CaptionManagementModule } from '@/backend/modules/caption-management/caption-management-module';
import { SupabaseCaptionManagementRepository } from '@/backend/modules/caption-management/caption-management-repository';
import {
  captionManagementActor,
  captionManagementErrorResponse,
} from './_management-adapter';

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || '';
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function buildCaptionRegenerationModule(userClient: SupabaseClient) {
  const generationRepository = new SupabaseCaptionGenerationRepository(
    userClient,
    createServiceClient()
  );
  const regenerator = new GeminiCaptionTextRegenerator(
    generationRepository,
    new GeminiCaptionAdapter()
  );
  return new CaptionManagementModule(
    new SupabaseCaptionManagementRepository(userClient),
    regenerator
  );
}

export { captionManagementActor, captionManagementErrorResponse };
