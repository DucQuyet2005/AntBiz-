export type DocumentParsingErrorCode =
  | 'INVALID_MULTIPART'
  | 'INVALID_FILE'
  | 'EMPTY_FILE'
  | 'UNSUPPORTED_FORMAT'
  | 'EMPTY_DOCUMENT'
  | 'PARSING_NOT_CONFIGURED'
  | 'PARSING_FAILED';

export class DocumentParsingError extends Error {
  constructor(
    public readonly code: DocumentParsingErrorCode,
    public readonly status: number,
    public readonly clientMessage: string,
    options?: { cause?: unknown; context?: Record<string, unknown> }
  ) {
    super(clientMessage, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'DocumentParsingError';
    this.context = options?.context;
  }

  public readonly context?: Record<string, unknown>;
}
