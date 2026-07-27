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
  error: any,
  fallback: QuickPublishingErrorCode,
  context?: Record<string, unknown>
): QuickPublishingFailure {
  if (error && typeof error === 'object' && 'code' in error) {
    return { 
      code: error.code, 
      ...(error.context ? { context: error.context } : {}) 
    };
  }
  
  const errorMessage = error?.message || String(error);
  return { 
    code: fallback, 
    context: { ...context, message: errorMessage } 
  };
}
