import type { SupabaseClient } from '@supabase/supabase-js';
import { ExportJobStoreError } from './caption-export-errors';
import type {
  CaptionExportFilters,
  ExportJobProjection,
  ExportJobRecord,
  ExportJobStatus,
  ExportJobStore,
} from './caption-export-types';

const EXPORT_ACTION = 'export_csv_job' as const;

type AuditLogRow = {
  id: unknown;
  actor_id: unknown;
  action: unknown;
  after_value: unknown;
  created_at: unknown;
};

export class AuditLogExportJobStore implements ExportJobStore {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(actorId: string, filters: CaptionExportFilters) {
    const { data, error } = await this.supabase
      .from('audit_logs')
      .insert({
        actor_id: actorId,
        action: EXPORT_ACTION,
        after_value: {
          status: 'pending',
          filters,
          created_at: new Date().toISOString(),
        },
      })
      .select('id, actor_id, action, after_value, created_at')
      .single();
    if (error || !data) throw new ExportJobStoreError('create-job', error);
    return toJobRecord(data as AuditLogRow, 'create-job');
  }

  async complete(jobId: string, downloadUrl: string, rowCount: number) {
    const currentValues = await this.readAfterValue(jobId);
    const { error } = await this.supabase
      .from('audit_logs')
      .update({
        after_value: {
          ...currentValues,
          status: 'completed',
          download_url: downloadUrl,
          row_count: rowCount,
          updated_at: new Date().toISOString(),
        },
      })
      .eq('id', jobId)
      .eq('action', EXPORT_ACTION);
    if (error) throw new ExportJobStoreError('complete-job', error);
  }

  async fail(jobId: string, errorMessage: string) {
    const currentValues = await this.readAfterValue(jobId);
    const { error } = await this.supabase
      .from('audit_logs')
      .update({
        after_value: {
          ...currentValues,
          status: 'failed',
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        },
      })
      .eq('id', jobId)
      .eq('action', EXPORT_ACTION);
    if (error) throw new ExportJobStoreError('fail-job', error);
  }

  async find(jobId: string) {
    const { data, error } = await this.supabase
      .from('audit_logs')
      .select('id, actor_id, action, after_value, created_at')
      .eq('id', jobId)
      .eq('action', EXPORT_ACTION)
      .maybeSingle();
    if (error) throw new ExportJobStoreError('find-job', error);
    return data ? toJobRecord(data as AuditLogRow, 'find-job') : null;
  }

  async list(actorId: string) {
    const { data, error } = await this.supabase
      .from('audit_logs')
      .select('id, actor_id, action, after_value, created_at')
      .eq('actor_id', actorId)
      .eq('action', EXPORT_ACTION)
      .order('created_at', { ascending: false });
    if (error) throw new ExportJobStoreError('list-jobs', error);
    return (data ?? []).map((row) => toProjection(row as AuditLogRow));
  }

  private async readAfterValue(jobId: string) {
    const { data, error } = await this.supabase
      .from('audit_logs')
      .select('after_value')
      .eq('id', jobId)
      .eq('action', EXPORT_ACTION)
      .maybeSingle();
    if (error || !data) throw new ExportJobStoreError('read-job-state', error);
    return record(data.after_value);
  }
}

function toJobRecord(
  row: AuditLogRow,
  operation: 'create-job' | 'find-job'
): ExportJobRecord {
  if (
    typeof row.id !== 'string'
    || typeof row.actor_id !== 'string'
    || row.action !== EXPORT_ACTION
    || typeof row.created_at !== 'string'
  ) {
    throw new ExportJobStoreError(operation, new Error('Invalid export job row'));
  }
  return {
    id: row.id,
    actorId: row.actor_id,
    action: EXPORT_ACTION,
    afterValue: row.after_value,
    createdAt: row.created_at,
  };
}

function toProjection(row: AuditLogRow): ExportJobProjection {
  const job = toJobRecord(row, 'find-job');
  const values = record(job.afterValue);
  const filters = record(values.filters) as CaptionExportFilters;
  const rowCount = Number.isSafeInteger(values.row_count) && (values.row_count as number) >= 0
    ? values.row_count as number
    : undefined;
  return {
    id: job.id,
    created_by: job.actorId,
    status: status(values.status),
    download_url: optionalString(values.download_url),
    error_message: optionalString(values.error_message),
    filters: Object.keys(filters).length ? filters : undefined,
    row_count: rowCount,
    created_at: job.createdAt,
  };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function status(value: unknown): ExportJobStatus {
  return value === 'processing' || value === 'completed' || value === 'failed'
    ? value
    : 'pending';
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value ? value : undefined;
}
