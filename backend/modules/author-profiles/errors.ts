export type AuthorProfileErrorCode =
  | 'DUPLICATE_NAME'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'MISSING_SOURCE'
  | 'UNSAFE_URL'
  | 'NO_SAMPLES'
  | 'SOURCE_FAILED';

export class AuthorProfileError extends Error {
  constructor(
    readonly code: AuthorProfileErrorCode,
    readonly status: 400 | 403 | 404 | 422 | 500,
    readonly clientMessage: string,
    readonly cause?: unknown
  ) {
    super(clientMessage);
    this.name = 'AuthorProfileError';
  }
}

export class AuthorProfileRepositoryError extends Error {
  constructor(readonly operation: string, readonly cause: unknown) {
    super(`Author Profile repository operation failed: ${operation}`);
    this.name = 'AuthorProfileRepositoryError';
  }
}
