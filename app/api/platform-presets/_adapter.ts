import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { PlatformPresetModuleError } from '@/backend/modules/platform-presets/errors';
import { PlatformPresetModule } from '@/backend/modules/platform-presets/platform-preset-module';
import { SupabasePlatformPresetRepository } from '@/backend/modules/platform-presets/platform-preset-repository';
import type {
  PlatformPresetActor,
  PlatformPresetRole,
} from '@/backend/modules/platform-presets/platform-preset-types';

export function buildPlatformPresetModule(supabase: SupabaseClient) {
  return new PlatformPresetModule(new SupabasePlatformPresetRepository(supabase));
}
export function platformPresetActor(userId: string, role: string | null): PlatformPresetActor {
  return { id: userId, role: role as PlatformPresetRole };
}

export function platformPresetErrorResponse(error: unknown, logLabel: string) {
  if (error instanceof PlatformPresetModuleError) {
    if (error.code === 'PRESET_PERSISTENCE_FAILED' || error.cause) {
      console.error(logLabel, error.cause, error.context);
    }

    const status =
      error.code === 'PRESET_NOT_FOUND'
        ? 404
        : error.code === 'PRESET_ACCESS_DENIED'
          ? 403
          : error.code === 'PRESET_VALIDATION_FAILED'
            ? 400
            : 500;

    return NextResponse.json({ error: error.clientMessage }, { status });
  }

  console.error(logLabel, error);
  const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
  return NextResponse.json({ error: message }, { status: 500 });
}
