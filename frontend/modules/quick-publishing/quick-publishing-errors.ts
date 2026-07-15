import type { QuickPublishingErrorCode, QuickPublishingFailure } from './quick-publishing-types';

export class QuickPublishingError extends Error {
  constructor(
    readonly code: QuickPublishingErrorCode,
    readonly context?: Record<string, unknown>
  ) {
    super(code);
    this.name = 'QuickPublishingError';
  }

  toFailure(): QuickPublishingFailure {
    return { code: this.code, ...(this.context ? { context: this.context } : {}) };
  }
}

export function toQuickPublishingFailure(
  error: unknown,
  fallback: QuickPublishingErrorCode,
  context?: Record<string, unknown>
): QuickPublishingFailure {
  if (error instanceof QuickPublishingError) return error.toFailure();
  return { code: fallback, ...(context ? { context } : {}) };
}
