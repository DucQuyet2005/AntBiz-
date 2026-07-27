export type CaptionExportErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'INVALID_JOB_DATA';

export class CaptionExportError extends Error {
  constructor(
    public readonly code: CaptionExportErrorCode,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'CaptionExportError';
  }
}

export type CaptionExportRepositoryOperation = 'count-captions' | 'list-captions';

export class CaptionExportRepositoryError extends Error {
  constructor(
    public readonly operation: CaptionExportRepositoryOperation,
    cause: unknown
  ) {
    super('Caption export repository operation failed', { cause });
    this.name = 'CaptionExportRepositoryError';
  }
}

export type ExportJobStoreOperation =
  | 'create-job'
  | 'read-job-state'
  | 'complete-job'
  | 'fail-job'
  | 'find-job'
  | 'list-jobs';

export class ExportJobStoreError extends Error {
  constructor(
    public readonly operation: ExportJobStoreOperation,
    cause: unknown
  ) {
    super('Export job store operation failed', { cause });
    this.name = 'ExportJobStoreError';
  }
}
