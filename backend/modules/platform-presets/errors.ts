export type PlatformPresetErrorCode =
  | 'PRESET_NOT_FOUND'
  | 'PRESET_ACCESS_DENIED'
  | 'PRESET_VALIDATION_FAILED'
  | 'PRESET_PERSISTENCE_FAILED';

export class PlatformPresetModuleError extends Error {
  constructor(
    readonly code: PlatformPresetErrorCode,
    readonly clientMessage: string,
    readonly cause?: unknown,
    readonly context?: Record<string, unknown>
  ) {
    super(clientMessage);
    this.name = 'PlatformPresetModuleError';
  }
}
export class PlatformPresetRepositoryError extends Error {
  constructor(readonly operation: string, readonly cause: unknown) {
    super(`Platform Preset repository operation failed: ${operation}`);
    this.name = 'PlatformPresetRepositoryError';
  }
}

export function platformPresetErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return String(error);
}
