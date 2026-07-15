export type CaptionExportRole = 'admin' | 'marketer_full' | 'marketer_content';
export type ExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface CaptionExportActor {
  id: string;
  role: CaptionExportRole;
}

export interface RawCaptionExportFilters {
  platform?: string | null;
  search?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface CaptionExportFilters {
  platform?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export type ExportRelation = Record<string, unknown> | Array<Record<string, unknown>> | null;

export interface CaptionExportRow {
  id?: unknown;
  platform?: unknown;
  ai_content?: unknown;
  edited_content?: unknown;
  status?: unknown;
  created_at?: unknown;
  articles?: ExportRelation;
  prompts?: ExportRelation;
  users?: ExportRelation;
}

export interface ExportJobRecord {
  id: string;
  actorId: string;
  action: 'export_csv_job';
  afterValue: unknown;
  createdAt: string;
}

export interface ExportJobProjection {
  id: string;
  created_by: string;
  status: ExportJobStatus;
  download_url?: string;
  error_message?: string;
  filters?: CaptionExportFilters;
  row_count?: number;
  created_at: string;
}

export interface CaptionExportArtifact {
  csv: string;
  jobId: string;
  filename: string;
}

export interface CaptionExportRepository {
  count(filters: CaptionExportFilters): Promise<number>;
  list(filters: CaptionExportFilters, limit: number): Promise<CaptionExportRow[]>;
}

export interface ExportJobStore {
  create(actorId: string, filters: CaptionExportFilters): Promise<ExportJobRecord>;
  complete(jobId: string, downloadUrl: string, rowCount: number): Promise<void>;
  fail(jobId: string, errorMessage: string): Promise<void>;
  find(jobId: string): Promise<ExportJobRecord | null>;
  list(actorId: string): Promise<ExportJobProjection[]>;
}

export interface CaptionCsvSerializer {
  serialize(rows: CaptionExportRow[]): string;
}
