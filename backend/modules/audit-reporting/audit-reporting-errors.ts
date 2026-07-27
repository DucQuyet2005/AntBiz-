export class AuditReportingError extends Error {
  constructor(
    readonly code: 'VALIDATION',
    readonly status: 400,
    readonly clientMessage: string,
    readonly cause?: unknown
  ) {
    super(clientMessage);
    this.name = 'AuditReportingError';
  }
}

export class AuditReportingRepositoryError extends Error {
  constructor(readonly operation: string, readonly cause: unknown) {
    super(`Audit reporting repository operation failed: ${operation}`);
    this.name = 'AuditReportingRepositoryError';
  }
}
