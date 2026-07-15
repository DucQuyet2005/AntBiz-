import type { SupabaseClient } from '@supabase/supabase-js';
import { SafeCaptionCsvSerializer } from './caption-csv-serializer';
import { CaptionExportModule } from './caption-export-module';
import { SupabaseCaptionExportRepository } from './caption-export-repository';
import { AuditLogExportJobStore } from './export-job-store';

export function createCaptionExportModule(
  userSupabase: SupabaseClient,
  adminSupabase: SupabaseClient
) {
  return new CaptionExportModule(
    new SupabaseCaptionExportRepository(userSupabase),
    new AuditLogExportJobStore(adminSupabase),
    new SafeCaptionCsvSerializer()
  );
}
