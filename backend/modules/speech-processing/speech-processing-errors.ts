export type SpeechProcessingErrorCode =
  | 'INVALID_MULTIPART'
  | 'INVALID_INPUT'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'FILE_TOO_LARGE'
  | 'EMPTY_TRANSCRIPT'
  | 'TRANSCRIPTION_NOT_CONFIGURED'
  | 'TRANSCRIPTION_FAILED';

export class SpeechProcessingError extends Error {
  constructor(
    public readonly code: SpeechProcessingErrorCode,
    public readonly status: number,
    public readonly clientMessage: string,
    options?: { cause?: unknown; context?: Record<string, unknown> }
  ) {
    super(clientMessage, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'SpeechProcessingError';
    this.context = options?.context;
  }

  public readonly context?: Record<string, unknown>;
}
