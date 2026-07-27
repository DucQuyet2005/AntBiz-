export class PasswordRecoveryError extends Error {
  constructor(
    readonly code: 'VALIDATION',
    readonly status: 400,
    readonly clientMessage: string,
    readonly cause?: unknown
  ) {
    super(clientMessage);
    this.name = 'PasswordRecoveryError';
  }
}

export class PasswordRecoveryGatewayError extends Error {
  constructor(
    readonly operation: 'generateRecoveryToken' | 'updateRecoveredPassword' | 'revokeAllSessions',
    readonly cause: unknown
  ) {
    super(`Password Recovery gateway operation failed: ${operation}`);
    this.name = 'PasswordRecoveryGatewayError';
  }
}

export class PasswordRecoveryOriginError extends Error {
  constructor(readonly cause?: unknown) {
    super('No trusted HTTP(S) application origin is available');
    this.name = 'PasswordRecoveryOriginError';
  }
}
