export type AccountSecurityErrorCode = 'VALIDATION' | 'INVALID_CREDENTIAL';

export class AccountSecurityError extends Error {
  constructor(
    readonly code: AccountSecurityErrorCode,
    readonly status: 400,
    readonly clientMessage: string,
    readonly cause?: unknown
  ) {
    super(clientMessage);
    this.name = 'AccountSecurityError';
  }
}

export class AccountSecurityGatewayError extends Error {
  constructor(
    readonly operation: 'updatePassword' | 'revokeAllSessions',
    readonly cause: unknown
  ) {
    super(`Account Security gateway operation failed: ${operation}`);
    this.name = 'AccountSecurityGatewayError';
  }
}
