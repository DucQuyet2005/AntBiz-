import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountSecurityModule } from '@/backend/modules/account-security/account-security-module';
import type {
  AccountSecurityEffects,
  AccountSecurityGateway,
} from '@/backend/modules/account-security/account-security-types';

describe('AccountSecurityModule', () => {
  let gateway: AccountSecurityGateway;
  let effects: AccountSecurityEffects;
  let securityModule: AccountSecurityModule;

  beforeEach(() => {
    gateway = {
      verifyCurrentPassword: vi.fn().mockResolvedValue(true),
      updatePassword: vi.fn(),
      revokeAllSessions: vi.fn(),
    };
    effects = {
      createPasswordChangedNotification: vi.fn(),
      sendPasswordChangedEmail: vi.fn(),
    };
    securityModule = new AccountSecurityModule(
      gateway, effects, () => '2026-07-15T12:00:00.000Z'
    );
  });

  it('verifies, updates, then runs every post-update task', async () => {
    const order: string[] = [];
    vi.mocked(gateway.verifyCurrentPassword).mockImplementation(async () => {
      order.push('verify'); return true;
    });
    vi.mocked(gateway.updatePassword).mockImplementation(async () => { order.push('update'); });
    vi.mocked(gateway.revokeAllSessions).mockImplementation(async () => { order.push('revoke'); });
    vi.mocked(effects.createPasswordChangedNotification)
      .mockImplementation(async () => { order.push('notification'); });
    vi.mocked(effects.sendPasswordChangedEmail)
      .mockImplementation(async () => { order.push('email'); });

    await securityModule.changePassword(actor(), validInput());
    expect(order.slice(0, 2)).toEqual(['verify', 'update']);
    expect(order.slice(2).sort()).toEqual(['email', 'notification', 'revoke']);
    expect(gateway.verifyCurrentPassword).toHaveBeenCalledWith(
      'user@example.com', 'OldPassword123!'
    );
    expect(gateway.updatePassword).toHaveBeenCalledWith('NewPassword123!');
    expect(effects.sendPasswordChangedEmail).toHaveBeenCalledWith(
      actor(), '2026-07-15T12:00:00.000Z'
    );
  });

  it('stops after invalid current credentials', async () => {
    vi.mocked(gateway.verifyCurrentPassword).mockResolvedValue(false);
    await expect(securityModule.changePassword(actor(), validInput()))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIAL', status: 400 });
    expect(gateway.updatePassword).not.toHaveBeenCalled();
    expect(gateway.revokeAllSessions).not.toHaveBeenCalled();
    expect(effects.createPasswordChangedNotification).not.toHaveBeenCalled();
  });

  it('does not start post-update tasks when password update fails', async () => {
    vi.mocked(gateway.updatePassword).mockRejectedValue(new Error('update failed'));
    await expect(securityModule.changePassword(actor(), validInput())).rejects.toThrow('update failed');
    expect(gateway.revokeAllSessions).not.toHaveBeenCalled();
    expect(effects.createPasswordChangedNotification).not.toHaveBeenCalled();
    expect(effects.sendPasswordChangedEmail).not.toHaveBeenCalled();
  });

  it('contains independent post-update failures', async () => {
    vi.mocked(gateway.revokeAllSessions).mockRejectedValue(new Error('revoke failed'));
    vi.mocked(effects.createPasswordChangedNotification)
      .mockRejectedValue(new Error('notification failed'));
    vi.mocked(effects.sendPasswordChangedEmail).mockRejectedValue(new Error('email failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(securityModule.changePassword(actor(), validInput())).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledTimes(3);
    consoleSpy.mockRestore();
  });

  it('validates before contacting the auth provider', async () => {
    await expect(securityModule.changePassword(actor(), {
      currentPassword: 'same', newPassword: 'same',
    })).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(gateway.verifyCurrentPassword).not.toHaveBeenCalled();
  });
});

function actor() {
  return { id: 'u1', email: 'user@example.com' };
}

function validInput() {
  return { currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' };
}
