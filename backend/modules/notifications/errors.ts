export type NotificationErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'FORBIDDEN';

export class NotificationError extends Error {
  constructor(
    readonly code: NotificationErrorCode,
    readonly status: number,
    readonly clientMessage: string,
    readonly cause?: unknown
  ) {
    super(clientMessage);
    this.name = 'NotificationError';
  }
}

export class NotificationRepositoryError extends Error {
  constructor(readonly operation: string, readonly cause: unknown) {
    super(`Notification repository operation failed: ${operation}`);
    this.name = 'NotificationRepositoryError';
  }
}
