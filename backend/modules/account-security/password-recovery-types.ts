export interface PasswordRecoveryRequestGateway {
  generateRecoveryToken(email: string): Promise<string | null>;
}

export interface PasswordRecoverySessionGateway {
  verifyRecoveryToken(token: string): Promise<boolean>;
  updateRecoveredPassword(password: string): Promise<void>;
  revokeAllSessions(): Promise<void>;
}

export interface PasswordRecoveryEmail {
  sendRecoveryEmail(email: string, actionUrl: string): Promise<void>;
}

export interface ResetPasswordInput {
  password: string;
  confirmPassword: string;
}
