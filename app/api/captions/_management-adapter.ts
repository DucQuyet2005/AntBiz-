import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { CaptionManagementModule } from '@/backend/modules/caption-management/caption-management-module';
import { SupabaseCaptionManagementRepository } from '@/backend/modules/caption-management/caption-management-repository';
import { CaptionManagementError } from '@/backend/modules/caption-management/errors';
import type {
  CaptionManagementActor,
  CaptionManagementRole,
} from '@/backend/modules/caption-management/caption-management-types';

export function buildCaptionManagementModule(supabase: SupabaseClient) {
  return new CaptionManagementModule(new SupabaseCaptionManagementRepository(supabase));
}

export function captionManagementActor(id: string, role: string | null): CaptionManagementActor {
  return { id, role: role as CaptionManagementRole };
}

export function captionManagementErrorResponse(error: unknown, logLabel: string) {
  if (error instanceof CaptionManagementError) {
    if (error.status === 500 || error.cause) console.error(logLabel, error.cause, error.context);
    return NextResponse.json({ error: error.clientMessage }, { status: error.status });
  }
  console.error(logLabel, error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Lỗi hệ thống' },
    { status: 500 }
  );
}
