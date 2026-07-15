import type { SupabaseClient } from '@supabase/supabase-js';
import { AuditReportingRepositoryError } from './audit-reporting-errors';
import type {
  AuditLogRow,
  AuditReportInput,
  AuditReportingRepository,
} from './audit-reporting-types';

const AUDIT_LOG_SELECT = `
  id,
  action,
  before_value,
  after_value,
  created_at,
  target_user_id,
  actor_id,
  actor:users!audit_logs_actor_id_fkey(email),
  target:users!audit_logs_target_user_id_fkey(email)
`;

export class SupabaseAuditReportingRepository implements AuditReportingRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(input: AuditReportInput) {
    const from = (input.page - 1) * input.limit;
    const to = from + input.limit - 1;
    let query = this.supabase.from('audit_logs').select(AUDIT_LOG_SELECT, { count: 'exact' });
    if (input.action) query = query.eq('action', input.action);
    if (input.from) query = query.gte('created_at', input.from);
    if (input.to) query = query.lte('created_at', input.to);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to);
    if (error) throw new AuditReportingRepositoryError('list', error);
    return { data: (data || []) as AuditLogRow[], count: count || 0 };
  }
}
