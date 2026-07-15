export type UserAccessAdministrationErrorCode =
  | 'VALIDATION'
  | 'FORBIDDEN'
  | 'NOT_FOUND';

export class UserAccessAdministrationError extends Error {
  constructor(
    readonly code: UserAccessAdministrationErrorCode,
    readonly status: number,
    readonly clientMessage: string,
    readonly cause?: unknown
  ) {
    super(clientMessage);
    this.name = 'UserAccessAdministrationError';
  }
}

export class UserAccessAdministrationRepositoryError extends Error {
  constructor(readonly operation: string, readonly cause: unknown) {
    super(`User access administration repository operation failed: ${operation}`);
    this.name = 'UserAccessAdministrationRepositoryError';
  }
}
