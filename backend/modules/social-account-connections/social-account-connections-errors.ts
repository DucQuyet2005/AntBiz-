export type SocialAccountConnectionsErrorCode =
  | 'invalid_state'
  | 'configuration_error'
  | 'provider_denied'
  | 'provider_unavailable'
  | 'no_accounts'
  | 'persistence_failed'
  | 'invalid_platform'
  | 'connection_failed';

export class SocialAccountConnectionsError extends Error {
  constructor(
    public readonly code: SocialAccountConnectionsErrorCode,
    public readonly status: number,
    public readonly clientMessage: string,
    options?: { cause?: unknown; context?: Record<string, unknown> }
  ) {
    super(clientMessage, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'SocialAccountConnectionsError';
    this.context = options?.context;
  }

  public readonly context?: Record<string, unknown>;
}
