export type PromptConfigAiErrorCode = 'MISSING_GEMINI_KEY' | 'WIZARD_GENERATION_FAILED';

export class PromptConfigAiError extends Error {
  constructor(
    readonly code: PromptConfigAiErrorCode,
    readonly clientMessage: string,
    readonly cause?: unknown
  ) {
    super(clientMessage);
    this.name = 'PromptConfigAiError';
  }
}
