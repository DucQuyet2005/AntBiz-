export type GeminiCapacityErrorCode =
  | 'INVALID_INPUT'
  | 'DUPLICATE_KEY'
  | 'KEY_NOT_FOUND'
  | 'PERSISTENCE_FAILED'
  | 'CAPACITY_UNAVAILABLE'
  | 'CAPACITY_EXHAUSTED'
  | 'MODEL_CONFIGURATION_ERROR';

export class GeminiCapacityError extends Error {
  constructor(
    readonly code: GeminiCapacityErrorCode,
    readonly clientMessage: string,
    readonly context?: Record<string, unknown>
  ) {
    super(clientMessage);
    this.name = 'GeminiCapacityError';
  }
}

export class GeminiCapacityRepositoryError extends Error {
  constructor(
    readonly operation: string,
    readonly cause: unknown
  ) {
    super(`Gemini Capacity repository operation failed: ${operation}`);
    this.name = 'GeminiCapacityRepositoryError';
  }
}
