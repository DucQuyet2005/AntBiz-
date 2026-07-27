import {
  CaptionExportError,
  CaptionExportRepositoryError,
  ExportJobStoreError,
} from './caption-export-errors';
import {
  parseCaptionExportFilters,
  parseCaptionExportJobId,
  parseStoredCaptionExportFilters,
  parseStoredRowCount,
} from './caption-export-schemas';
import type {
  CaptionCsvSerializer,
  CaptionExportActor,
  CaptionExportArtifact,
  CaptionExportRepository,
  ExportJobStore,
  RawCaptionExportFilters,
} from './caption-export-types';

const EMPTY_COUNT_FALLBACK = 1000;

export class CaptionExportModule {
  constructor(
    private readonly repository: CaptionExportRepository,
    private readonly jobStore: ExportJobStore,
    private readonly serializer: CaptionCsvSerializer
  ) {}

  async create(
    actor: CaptionExportActor,
    rawFilters: RawCaptionExportFilters
  ): Promise<CaptionExportArtifact> {
    const filters = parseCaptionExportFilters(rawFilters);
    if (actor.role === 'marketer_content') {
      filters.creatorId = actor.id;
    }
    const rowCount = await this.repository.count(filters);
    let jobId: string | undefined;

    try {
      const job = await this.jobStore.create(actor.id, filters);
      jobId = job.id;
      const rows = await this.repository.list(
        filters,
        rowCount > 0 ? rowCount : EMPTY_COUNT_FALLBACK
      );
      const csv = this.serializer.serialize(rows);
      const downloadUrl = `/api/captions/export/download?jobId=${encodeURIComponent(job.id)}`;
      await this.jobStore.complete(job.id, downloadUrl, rows.length);
      return artifact(job.id, csv);
    } catch (error) {
      if (jobId) {
        try {
          await this.jobStore.fail(jobId, safeFailureMessage(error));
        } catch {
          // Failure recording is best-effort and must not hide the export failure.
        }
      }
      throw error;
    }
  }

  async download(actor: CaptionExportActor, rawJobId: string | null) {
    const jobId = parseCaptionExportJobId(rawJobId);
    const job = await this.jobStore.find(jobId);
    if (!job) {
      throw new CaptionExportError(
        'NOT_FOUND',
        404,
        'Không tìm thấy yêu cầu xuất dữ liệu tương ứng'
      );
    }
    if (actor.role !== 'admin' && job.actorId !== actor.id) {
      throw new CaptionExportError(
        'FORBIDDEN',
        403,
        'Bạn không có quyền tải tài liệu này'
      );
    }

    const afterValue = asRecord(job.afterValue);
    const filters = parseStoredCaptionExportFilters(afterValue.filters);
    const limit = parseStoredRowCount(afterValue.row_count);
    const rows = await this.repository.list(filters, limit);
    return artifact(job.id, this.serializer.serialize(rows));
  }

  list(actor: CaptionExportActor) {
    return this.jobStore.list(actor.id);
  }
}

function artifact(jobId: string, csv: string): CaptionExportArtifact {
  return {
    csv,
    jobId,
    filename: `antbiz_export_${jobId.substring(0, 8)}.csv`,
  };
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CaptionExportError(
      'INVALID_JOB_DATA',
      500,
      'Không thể đọc yêu cầu xuất dữ liệu'
    );
  }
  return value as Record<string, unknown>;
}

function safeFailureMessage(error: unknown) {
  if (error instanceof CaptionExportRepositoryError) return `Export failed: ${error.operation}`;
  if (error instanceof ExportJobStoreError) return `Export failed: ${error.operation}`;
  if (error instanceof CaptionExportError) return `Export failed: ${error.code.toLowerCase()}`;
  return 'Export failed';
}
