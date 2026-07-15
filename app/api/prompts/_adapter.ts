import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { PromptModuleError } from '@/backend/modules/prompts/errors';
import { PromptModule } from '@/backend/modules/prompts/prompt-module';
import { SupabasePromptRepository } from '@/backend/modules/prompts/prompt-repository';
import type { PromptActor, PromptRole } from '@/backend/modules/prompts/prompt-types';
import { createNotification } from '@/lib/services/notificationService';

export function buildPromptModule(supabase: SupabaseClient) {
  return new PromptModule(new SupabasePromptRepository(supabase), createNotification);
}

export function promptActor(userId: string, role: string | null): PromptActor {
  return { id: userId, role: role as PromptRole };
}

export function promptErrorResponse(error: unknown, logLabel: string) {
  if (error instanceof PromptModuleError) {
    if (error.code === 'PROMPT_PERSISTENCE_FAILED') {
      console.error(logLabel, error.cause, error.context);
    }

    const status =
      error.code === 'PROMPT_NOT_FOUND'
        ? 404
        : error.code === 'PROMPT_ACCESS_DENIED'
          ? 403
          : error.code === 'PROMPT_VALIDATION_FAILED'
            ? 400
            : 500;

    return NextResponse.json({ error: error.clientMessage }, { status });
  }

  console.error(logLabel, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

