import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PasswordRecoveryModule } from '@/backend/modules/account-security/password-recovery-module';
import type {
  PasswordRecoveryEmail,
  PasswordRecoveryRequestGateway,
  PasswordRecoverySessionGateway,
} from '@/backend/modules/account-security/password-recovery-types';

describe('PasswordRecoveryModule', () => {
  let requestGateway: PasswordRecoveryRequestGateway;
  let sessionGateway: PasswordRecoverySessionGateway;
  let recoveryEmail: PasswordRecoveryEmail;
  let recoveryModule: PasswordRecoveryModule;

  beforeEach(() => {
    requestGateway = { generateRecoveryToken: vi.fn().mockResolvedValue('token&value') };
    sessionGateway = {
      verifyRecoveryToken: vi.fn().mockResolvedValue(true),
      updateRecoveredPassword: vi.fn(), revokeAllSessions: vi.fn(),
    };
    recoveryEmail = { sendRecoveryEmail: vi.fn() };
    recoveryModule = new PasswordRecoveryModule(requestGateway, sessionGateway, recoveryEmail);
  });

  it('normalizes email and sends an encoded trusted recovery link', async () => {
    await recoveryModule.requestRecovery(
      { email: ' User@Example.COM ' }, 'https://app.antbiz.vn'
    );
    expect(requestGateway.generateRecoveryToken).toHaveBeenCalledWith('user@example.com');
    expect(recoveryEmail.sendRecoveryEmail).toHaveBeenCalledWith(
      'user@example.com',
      'https://app.antbiz.vn/api/auth/confirm?token_hash=token%26value&type=recovery'
    );
  });

  it.each(['generate', 'email'])('contains internal %s failures with the same accepted result', async (kind) => {
    if (kind === 'generate') {
      vi.mocked(requestGateway.generateRecoveryToken).mockRejectedValue(new Error('secret'));
    } else {
      vi.mocked(recoveryEmail.sendRecoveryEmail).mockRejectedValue(new Error('secret'));
    }
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(recoveryModule.requestRecovery(
      { email: 'user@example.com' }, 'https://app.antbiz.vn'
    )).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[PasswordRecovery] Internal operation failed', expect.objectContaining({ operation: expect.any(String) })
    );
    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain('secret');
    consoleSpy.mockRestore();
  });

  it('does not send email when no token is returned', async () => {
    vi.mocked(requestGateway.generateRecoveryToken).mockResolvedValue(null);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await recoveryModule.requestRecovery({ email: 'user@example.com' }, 'https://app.antbiz.vn');
    expect(recoveryEmail.sendRecoveryEmail).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('confirms only valid recovery input', async () => {
    await expect(recoveryModule.confirmRecovery('token', 'recovery')).resolves.toBe(true);
    await expect(recoveryModule.confirmRecovery('token', 'signup')).resolves.toBe(false);
    expect(sessionGateway.verifyRecoveryToken).toHaveBeenCalledTimes(1);
  });

  it('updates a valid reset password then globally signs out', async () => {
    await recoveryModule.resetPassword({ password: 'Password1', confirmPassword: 'Password1' });
    expect(sessionGateway.updateRecoveredPassword).toHaveBeenCalledWith('Password1');
    expect(sessionGateway.revokeAllSessions).toHaveBeenCalled();
  });

  it('does not revoke sessions after update failure', async () => {
    vi.mocked(sessionGateway.updateRecoveredPassword).mockRejectedValue(new Error('update'));
    await expect(recoveryModule.resetPassword({
      password: 'Password1', confirmPassword: 'Password1',
    })).rejects.toThrow('update');
    expect(sessionGateway.revokeAllSessions).not.toHaveBeenCalled();
  });

  it('contains global sign-out failure after reset', async () => {
    vi.mocked(sessionGateway.revokeAllSessions).mockRejectedValue(new Error('secret'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(recoveryModule.resetPassword({
      password: 'Password1', confirmPassword: 'Password1',
    })).resolves.toBeUndefined();
    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain('secret');
    consoleSpy.mockRestore();
  });
});
