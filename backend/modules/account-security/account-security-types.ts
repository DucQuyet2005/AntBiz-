export interface AccountSecurityActor {
  id: string;
  email: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface AccountSecurityGateway {
  verifyCurrentPassword(email: string, currentPassword: string): Promise<boolean>;
  updatePassword(newPassword: string): Promise<void>;
  revokeAllSessions(): Promise<void>;
}

export interface AccountSecurityEffects {
  createPasswordChangedNotification(actor: AccountSecurityActor): Promise<void>;
  sendPasswordChangedEmail(actor: AccountSecurityActor, changedAt: string): Promise<void>;
}
