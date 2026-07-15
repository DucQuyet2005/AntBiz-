export type PromptConfigErrorCode =
  | 'CONFIG_NOT_FOUND'
  | 'CONFIG_ACCESS_DENIED'
  | 'CONFIG_DUPLICATE_NAME'
  | 'CONFIG_VALIDATION_FAILED'
  | 'CONFIG_PERSISTENCE_FAILED';

export class PromptConfigModuleError extends Error {
  constructor(
    readonly code: PromptConfigErrorCode,
    readonly clientMessage: string,
    readonly cause?: unknown,
    readonly context?: Record<string, unknown>
  ) {
    super(clientMessage);
    this.name = 'PromptConfigModuleError';
  }
}

export class PromptConfigRepositoryError extends Error {
  constructor(readonly operation: string, readonly cause: unknown) {
    super(`Prompt Config repository operation failed: ${operation}`);
    this.name = 'PromptConfigRepositoryError';
  }
}

