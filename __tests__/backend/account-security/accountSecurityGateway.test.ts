import { describe, expect, it, vi } from 'vitest';
import { SupabaseAccountSecurityGateway } from '@/backend/modules/account-security/account-security-gateway';

describe('SupabaseAccountSecurityGateway', () => {
  it('verifies the supplied email and current password', async () => {
    const auth = fakeAuth();
    const gateway = new SupabaseAccountSecurityGateway({ auth } as never);
    await expect(gateway.verifyCurrentPassword('user@example.com', 'CurrentPass1!'))
      .resolves.toBe(true);
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com', password: 'CurrentPass1!',
    });
  });

  it('maps any verification error to an invalid credential result', async () => {
    const auth = fakeAuth();
    auth.signInWithPassword.mockResolvedValue({ error: new Error('provider detail') });
    const gateway = new SupabaseAccountSecurityGateway({ auth } as never);
    await expect(gateway.verifyCurrentPassword('user@example.com', 'wrong'))
      .resolves.toBe(false);
  });

  it('updates the password and wraps provider failures', async () => {
    const auth = fakeAuth();
    const gateway = new SupabaseAccountSecurityGateway({ auth } as never);
    await gateway.updatePassword('NewPassword1!');
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'NewPassword1!' });

    auth.updateUser.mockResolvedValue({ error: new Error('provider detail') });
    await expect(gateway.updatePassword('AnotherPassword1!')).rejects.toMatchObject({
      name: 'AccountSecurityGatewayError', operation: 'updatePassword',
    });
  });

  it('uses global sign-out and wraps revocation failures', async () => {
    const auth = fakeAuth();
    const gateway = new SupabaseAccountSecurityGateway({ auth } as never);
    await gateway.revokeAllSessions();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'global' });

    auth.signOut.mockResolvedValue({ error: new Error('provider detail') });
    await expect(gateway.revokeAllSessions()).rejects.toMatchObject({
      operation: 'revokeAllSessions',
    });
  });
});

function fakeAuth() {
  return {
    signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };
}
