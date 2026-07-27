export type AuditRelation =
  | { email?: unknown }
  | Array<{ email?: unknown }>
  | null;

export interface AuditLogRow {
  id: string;
  action: string;
  before_value: unknown;
  after_value: unknown;
  created_at: string;
  actor_id?: string | null;
  target_user_id?: string | null;
  actor: AuditRelation;
  target: AuditRelation;
}

export interface AuditLog {
  id: string;
  action: string;
  before_value: unknown;
  after_value: unknown;
  created_at: string;
  actor_email: string;
  target_email: string;
}

export interface AuditReportInput {
  action?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export interface AuditReportRepositoryResult {
  data: AuditLogRow[];
  count: number;
}

export interface AuditReportingRepository {
  list(input: AuditReportInput): Promise<AuditReportRepositoryResult>;
}
