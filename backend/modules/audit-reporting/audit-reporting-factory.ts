import type { SupabaseClient } from '@supabase/supabase-js';
import { AuditReportingModule } from './audit-reporting-module';
import { SupabaseAuditReportingRepository } from './audit-reporting-repository';

export function createAuditReportingModule(supabase: SupabaseClient) {
  return new AuditReportingModule(new SupabaseAuditReportingRepository(supabase));
}
