export type LandingConfigurationErrorCode =
  | 'INVALID_INPUT'
  | 'CONFIGURATION_NOT_FOUND'
  | 'DUPLICATE_CONFIGURATION'
  | 'FORBIDDEN'
  | 'PERSISTENCE_FAILED'
  | 'ROLLBACK_FAILED';

export class LandingConfigurationModuleError extends Error {
  constructor(
    readonly code: LandingConfigurationErrorCode,
    readonly clientMessage: string,
    readonly cause?: unknown,
    readonly context?: Record<string, unknown>
  ) {
    super(clientMessage);
    this.name = 'LandingConfigurationModuleError';
  }
}

export class LandingConfigurationRepositoryError extends Error {
  constructor(readonly operation: string, readonly cause: unknown) {
    super(`Landing Configuration repository operation failed: ${operation}`);
    this.name = 'LandingConfigurationRepositoryError';
  }
}
