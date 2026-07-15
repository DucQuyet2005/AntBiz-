import {
  parseRecoveryConfirmation,
  parseRecoveryRequest,
  parseResetPassword,
} from './password-recovery-schemas';
import type {
  PasswordRecoveryEmail,
  PasswordRecoveryRequestGateway,
  PasswordRecoverySessionGateway,
} from './password-recovery-types';

export class PasswordRecoveryModule {
  constructor(
    private readonly requestGateway: PasswordRecoveryRequestGateway,
    private readonly sessionGateway: PasswordRecoverySessionGateway,
    private readonly recoveryEmail: PasswordRecoveryEmail
  ) {}

  async requestRecovery(rawInput: unknown, trustedOrigin: string) {
    const { email } = parseRecoveryRequest(rawInput);
    let token: string | null = null;
    try {
      token = await this.requestGateway.generateRecoveryToken(email);
    } catch {
      this.logInternalFailure('generateRecoveryToken');
      return;
    }
    if (!token) {
      this.logInternalFailure('generateRecoveryToken');
      return;
    }

    const confirmationUrl = new URL('/api/auth/confirm', trustedOrigin);
    confirmationUrl.searchParams.set('token_hash', token);
    confirmationUrl.searchParams.set('type', 'recovery');
    try {
      await this.recoveryEmail.sendRecoveryEmail(email, confirmationUrl.toString());
    } catch {
      this.logInternalFailure('recoveryEmail');
    }
  }

  async confirmRecovery(rawToken: unknown, rawType: unknown) {
    try {
      const { token } = parseRecoveryConfirmation(rawToken, rawType);
      return await this.sessionGateway.verifyRecoveryToken(token);
    } catch {
      return false;
    }
  }

  async resetPassword(rawInput: unknown) {
    const { password } = parseResetPassword(rawInput);
    await this.sessionGateway.updateRecoveredPassword(password);
    try {
      await this.sessionGateway.revokeAllSessions();
    } catch {
      this.logInternalFailure('revokeAllSessions');
    }
  }

  private logInternalFailure(operation: string) {
    console.error('[PasswordRecovery] Internal operation failed', { operation });
  }
}
