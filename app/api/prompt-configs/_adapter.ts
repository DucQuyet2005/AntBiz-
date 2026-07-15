import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { PromptConfigModuleError } from '@/backend/modules/prompt-configs/errors';
import { PromptConfigModule } from '@/backend/modules/prompt-configs/prompt-config-module';
import { SupabasePromptConfigRepository } from '@/backend/modules/prompt-configs/prompt-config-repository';
import type {
  PromptConfigActor,
  PromptConfigRole,
} from '@/backend/modules/prompt-configs/prompt-config-types';

export function buildPromptConfigModule(supabase: SupabaseClient) {
  return new PromptConfigModule(new SupabasePromptConfigRepository(supabase));
}

export function promptConfigActor(userId: string, role: string | null): PromptConfigActor {
  return { id: userId, role: role as PromptConfigRole };
}

export function promptConfigErrorResponse(error: unknown, logLabel: string) {
  if (error instanceof PromptConfigModuleError) {
    if (error.code === 'CONFIG_PERSISTENCE_FAILED' || error.cause) {
      console.error(logLabel, error.cause, error.context);
    }

    const status =
      error.code === 'CONFIG_NOT_FOUND'
        ? 404
        : error.code === 'CONFIG_ACCESS_DENIED'
          ? 403
          : error.code === 'CONFIG_DUPLICATE_NAME' || error.code === 'CONFIG_VALIDATION_FAILED'
            ? 400
            : 500;

    return NextResponse.json({ error: error.clientMessage }, { status });
  }

  console.error(logLabel, error);
  const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
  return NextResponse.json({ error: message }, { status: 500 });
}

