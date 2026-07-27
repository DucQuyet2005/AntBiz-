import { describe, expect, it, vi } from 'vitest';
import {
  SupabasePasswordRecoveryRequestGateway,
  SupabasePasswordRecoverySessionGateway,
} from '@/backend/modules/account-security/password-recovery-gateway';

describe('Password Recovery gateways', () => {
  it('generates and extracts a hashed recovery token', async () => {
    const generateLink = vi.fn().mockResolvedValue({
      data: { properties: { hashed_token: 'token' } }, error: null,
    });
    const gateway = new SupabasePasswordRecoveryRequestGateway({
      auth: { admin: { generateLink } },
    });
    await expect(gateway.generateRecoveryToken('user@example.com')).resolves.toBe('token');
    expect(generateLink).toHaveBeenCalledWith({ type: 'recovery', email: 'user@example.com' });
  });

  it('wraps token-generation failures', async () => {
    const gateway = new SupabasePasswordRecoveryRequestGateway({
      auth: { admin: { generateLink: vi.fn().mockResolvedValue({ data: null, error: new Error('x') }) } },
    });
    await expect(gateway.generateRecoveryToken('user@example.com')).rejects.toMatchObject({
      operation: 'generateRecoveryToken',
    });
  });

  it('verifies only recovery OTP and maps failures to false', async () => {
    const auth = sessionAuth();
    const gateway = new SupabasePasswordRecoverySessionGateway({ auth } as never);
    await expect(gateway.verifyRecoveryToken('token')).resolves.toBe(true);
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'token' });
    auth.verifyOtp.mockResolvedValue({ error: new Error('invalid') });
    await expect(gateway.verifyRecoveryToken('wrong')).resolves.toBe(false);
  });

  it('updates the password, globally signs out, and wraps failures', async () => {
    const auth = sessionAuth();
    const gateway = new SupabasePasswordRecoverySessionGateway({ auth } as never);
    await gateway.updateRecoveredPassword('Password1');
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'Password1' });
    await gateway.revokeAllSessions();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'global' });

    auth.updateUser.mockResolvedValue({ error: new Error('provider detail') });
    await expect(gateway.updateRecoveredPassword('Password2')).rejects.toMatchObject({
      operation: 'updateRecoveredPassword',
    });
  });
});

function sessionAuth() {
  return {
    verifyOtp: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };
}
