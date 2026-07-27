export type ArticleIngestionErrorCode =
  | 'INVALID_URL'
  | 'UNSAFE_URL'
  | 'SOURCE_FAILED'
  | 'MANUAL_PERSISTENCE_FAILED';

export class ArticleIngestionError extends Error {
  constructor(
    readonly code: ArticleIngestionErrorCode,
    readonly status: 400 | 500,
    readonly clientMessage: string,
    readonly cause?: unknown
  ) {
    super(clientMessage);
    this.name = 'ArticleIngestionError';
  }
}

export class ArticleIngestionRepositoryError extends Error {
  constructor(readonly operation: string, readonly cause: unknown) {
    super(`Article Ingestion repository operation failed: ${operation}`);
    this.name = 'ArticleIngestionRepositoryError';
  }
}
