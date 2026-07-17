export type ScheduledPublishingErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'PUBLICATION_FAILED'
  | 'PERSISTENCE';

export class ScheduledPublishingError extends Error {
  constructor(
    readonly code: ScheduledPublishingErrorCode,
    readonly status: number,
    readonly clientMessage: string,
    readonly cause?: unknown
  ) {
    super(clientMessage);
    this.name = 'ScheduledPublishingError';
  }
}
export class ScheduledPublishingRepositoryError extends Error {
  constructor(readonly operation: string, readonly cause: unknown) {
    super(`Scheduled Publishing repository operation failed: ${operation}`);
    this.name = 'ScheduledPublishingRepositoryError';
  }
}
