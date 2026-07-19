export type CaptionManagementErrorCode =
  | 'CAPTION_NOT_FOUND'
  | 'ARTICLE_NOT_FOUND'
  | 'CAPTION_LOCKED'
  | 'CAPTION_ACCESS_DENIED'
  | 'CAPTION_SELECTION_INVALID'
  | 'CAPTION_STALE'
  | 'CAPTION_REGENERATION_FAILED'
  | 'PRESET_NOT_FOUND'
  | 'PRESET_PLATFORM_MISMATCH'
  | 'CAPTION_PERSISTENCE_FAILED'
  | 'VERSION_PERSISTENCE_FAILED';

export class CaptionManagementError extends Error {
  constructor(
    readonly code: CaptionManagementErrorCode,
    readonly status: 400 | 403 | 404 | 409 | 500,
    readonly clientMessage: string,
    readonly cause?: unknown,
    readonly context?: Record<string, unknown>
  ) {
    super(clientMessage);
    this.name = 'CaptionManagementError';
  }
}

export class CaptionManagementRepositoryError extends Error {
  constructor(readonly operation: string, readonly cause: unknown) {
    super(`Caption Management repository operation failed: ${operation}`);
    this.name = 'CaptionManagementRepositoryError';
  }
}
