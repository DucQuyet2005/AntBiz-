import { AccountSecurityError } from './account-security-errors';
import { parseChangePasswordInput } from './account-security-schemas';
import type {
  AccountSecurityActor,
  AccountSecurityEffects,
  AccountSecurityGateway,
} from './account-security-types';

export class AccountSecurityModule {
  constructor(
    private readonly gateway: AccountSecurityGateway,
    private readonly effects: AccountSecurityEffects,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  async changePassword(actor: AccountSecurityActor, rawInput: unknown) {
    const input = parseChangePasswordInput(rawInput);
    const verified = await this.gateway.verifyCurrentPassword(actor.email, input.currentPassword);
    if (!verified) {
      throw new AccountSecurityError(
        'INVALID_CREDENTIAL',
        400,
        'Mật khẩu hiện tại không chính xác.'
      );
    }

    await this.gateway.updatePassword(input.newPassword);
    const changedAt = this.now();
    await Promise.all([
      this.runBestEffort('revokeAllSessions', actor.id, () => this.gateway.revokeAllSessions()),
      this.runBestEffort('notification', actor.id, () => (
        this.effects.createPasswordChangedNotification(actor)
      )),
      this.runBestEffort('email', actor.id, () => (
        this.effects.sendPasswordChangedEmail(actor, changedAt)
      )),
    ]);
  }

  private async runBestEffort(
    task: string,
    userId: string,
    run: () => Promise<void>
  ) {
    try {
      await run();
    } catch (error) {
      console.error('[AccountSecurity] Post-update task failed', { task, userId, error });
    }
  }
}
