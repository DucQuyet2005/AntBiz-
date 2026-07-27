export type PromptErrorCode =
  | 'PROMPT_NOT_FOUND'
  | 'PROMPT_ACCESS_DENIED'
  | 'PROMPT_VALIDATION_FAILED'
  | 'PROMPT_PERSISTENCE_FAILED';

export class PromptModuleError extends Error {
  constructor(
    readonly code: PromptErrorCode,
    readonly clientMessage: string,
    readonly cause?: unknown,
    readonly context?: Record<string, unknown>
  ) {
    super(clientMessage);
    this.name = 'PromptModuleError';
  }
}

export class PromptRepositoryError extends Error {
  constructor(readonly operation: string, readonly cause: unknown) {
    super(`Prompt repository operation failed: ${operation}`);
    this.name = 'PromptRepositoryError';
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return String(error);
}
