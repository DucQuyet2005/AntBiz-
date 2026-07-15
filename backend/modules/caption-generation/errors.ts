export type CaptionGenerationErrorCode =
  | 'INVALID_URL'
  | 'LISTING_PAGE'
  | 'ARTICLE_NOT_FOUND'
  | 'PROMPT_NOT_FOUND'
  | 'ARTICLE_READ_FAILED'
  | 'ARTICLE_WRITE_FAILED'
  | 'CRAWLER_FAILED'
  | 'GENERATION_FAILED';

export class CaptionGenerationError extends Error {
  constructor(
    readonly code: CaptionGenerationErrorCode,
    readonly status: 400 | 404 | 500,
    readonly clientMessage: string,
    readonly cause?: unknown,
    readonly context?: Record<string, unknown>
  ) {
    super(clientMessage);
    this.name = 'CaptionGenerationError';
  }
}

export class CaptionGenerationRepositoryError extends Error {
  constructor(readonly operation: string, readonly cause: unknown) {
    super(`Caption Generation repository operation failed: ${operation}`);
    this.name = 'CaptionGenerationRepositoryError';
  }
}
