import { NextResponse } from 'next/server';
import {
  CaptionExportError,
  CaptionExportRepositoryError,
  createCaptionExportModule,
  ExportJobStoreError,
} from '@/backend/modules/caption-export';
import type { CaptionExportRole } from '@/backend/modules/caption-export';
import { createAdminClient } from '@/utils/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

export const CAPTION_EXPORT_ROLES: CaptionExportRole[] = [
  'admin',
  'marketer_full',
  'marketer_content',
];

export function buildCaptionExportModule(userSupabase: SupabaseClient) {
  return createCaptionExportModule(userSupabase, createAdminClient());
}

export function captionExportJsonErrorResponse(error: unknown, context: string) {
  const mapped = mapError(error, context);
  return NextResponse.json({ error: mapped.message }, { status: mapped.status });
}

export function captionExportTextErrorResponse(error: unknown, context: string) {
  const mapped = mapError(error, context);
  return new Response(mapped.message, { status: mapped.status });
}

function mapError(error: unknown, context: string) {
  if (error instanceof CaptionExportError) {
    return { status: error.status, message: error.message };
  }
  if (error instanceof CaptionExportRepositoryError) {
    console.error(`${context} repository operation failed: ${error.operation}`);
  } else if (error instanceof ExportJobStoreError) {
    console.error(`${context} job-store operation failed: ${error.operation}`);
  } else {
    console.error(`${context} unexpected failure`);
  }
  return { status: 500, message: 'Không thể thực hiện yêu cầu xuất dữ liệu' };
}
