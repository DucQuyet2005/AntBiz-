import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  PasswordRecoveryError,
  PasswordRecoveryGatewayError,
} from '@/backend/modules/account-security/password-recovery-errors';

const mocks = vi.hoisted(() => {
  const signInMock = vi.fn();
  return {
    requireUser: vi.fn(),
    createClient: vi.fn(() => ({
      auth: {
        signInWithPassword: signInMock,
      }
    })),
    recoveryModule: {
      requestRecovery: vi.fn(), confirmRecovery: vi.fn(), resetPassword: vi.fn(),
    },
  };
});

vi.mock('@/lib/api/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/utils/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/backend/modules/account-security/password-recovery-factory', () => ({
  createPasswordRecoveryModule: vi.fn(() => mocks.recoveryModule),
}));

import { POST as forgotPassword } from '@/app/api/auth/forgot-password/route';
import { GET as confirmAuth } from '@/app/api/auth/confirm/route';
import { POST as resetPassword } from '@/app/api/auth/reset-password/route';
import { POST as loginDirect } from '@/app/api/auth/login/route';

describe('Password Recovery route contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.antbiz.vn';
    mocks.requireUser.mockResolvedValue({
      supabase: { kind: 'session' }, user: { id: 'u1', email: 'user@example.com' },
      unauthorized: null,
    });
    mocks.recoveryModule.requestRecovery.mockResolvedValue(undefined);
    mocks.recoveryModule.confirmRecovery.mockResolvedValue(true);
    mocks.recoveryModule.resetPassword.mockResolvedValue(undefined);
    
    // Set default mock cho direct login
    const client = mocks.createClient();
    vi.mocked(client.auth.signInWithPassword).mockResolvedValue({
      data: { session: { access_token: 'token123', user: { id: 'u1' } } } as any,
      error: null,
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('returns 400 for malformed JSON', async () => {
      expect((await forgotPassword(post('/api/auth/forgot-password', '{'))).status).toBe(400);
      expect(mocks.recoveryModule.requestRecovery).not.toHaveBeenCalled();
    });

    it('maps email validation to 400', async () => {
      mocks.recoveryModule.requestRecovery.mockRejectedValue(
        new PasswordRecoveryError('VALIDATION', 400, 'Email không hợp lệ.')
      );
      const response = await forgotPassword(post(
        '/api/auth/forgot-password', JSON.stringify({ email: 'invalid' })
      ));
      expect(response.status).toBe(400);
    });

    it('passes a trusted origin and returns the generic accepted response', async () => {
      const body = { email: ' User@Example.com ' };
      const response = await forgotPassword(post(
        '/api/auth/forgot-password', JSON.stringify(body),
        { host: 'attacker.example', 'x-forwarded-host': 'attacker.example' }
      ));
      expect(response.status).toBe(200);
      expect(mocks.recoveryModule.requestRecovery).toHaveBeenCalledWith(
        body, 'https://app.antbiz.vn'
      );
      expect((await response.json()).message).toContain('Nếu tài khoản tồn tại');
    });
  });

  describe('GET /api/auth/confirm', () => {
    it('redirects a verified recovery token to the fixed reset page', async () => {
      const response = await confirmAuth(new NextRequest(
        'http://localhost/api/auth/confirm?token_hash=token&type=recovery&next=https://evil.example'
      ));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('https://app.antbiz.vn/reset-password');
      expect(mocks.recoveryModule.confirmRecovery).toHaveBeenCalledWith('token', 'recovery');
    });

    it('redirects failed confirmation to login with a generic error', async () => {
      mocks.recoveryModule.confirmRecovery.mockResolvedValue(false);
      const response = await confirmAuth(new NextRequest(
        'http://localhost/api/auth/confirm?token_hash=wrong&type=recovery'
      ));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('https://app.antbiz.vn/login?error=');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('authenticates before reading reset credentials', async () => {
      mocks.requireUser.mockResolvedValue({
        supabase: {}, user: null,
        unauthorized: Response.json({ error: 'Unauthorized' }, { status: 401 }),
      });
      const response = await resetPassword(post('/api/auth/reset-password', '{'));
      expect(response.status).toBe(401);
      expect(mocks.recoveryModule.resetPassword).not.toHaveBeenCalled();
    });

    it('returns 400 for malformed JSON and typed validation', async () => {
      expect((await resetPassword(post('/api/auth/reset-password', '{'))).status).toBe(400);
      mocks.recoveryModule.resetPassword.mockRejectedValue(
        new PasswordRecoveryError('VALIDATION', 400, 'Mật khẩu xác nhận không trùng khớp')
      );
      expect((await resetPassword(post(
        '/api/auth/reset-password', JSON.stringify(resetInput())
      ))).status).toBe(400);
    });

    it('preserves the reset success response', async () => {
      const input = resetInput();
      const response = await resetPassword(post(
        '/api/auth/reset-password', JSON.stringify(input)
      ));
      expect(mocks.recoveryModule.resetPassword).toHaveBeenCalledWith(input);
      expect(response.status).toBe(200);
      expect((await response.json()).success).toBe(true);
    });

    it('does not expose password update provider errors', async () => {
      mocks.recoveryModule.resetPassword.mockRejectedValue(
        new PasswordRecoveryGatewayError('updateRecoveredPassword', new Error('provider secret'))
      );
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const response = await resetPassword(post(
        '/api/auth/reset-password', JSON.stringify(resetInput())
      ));
      expect(response.status).toBe(500);
      expect((await response.json()).error).toBe(
        'Không thể đặt lại mật khẩu. Vui lòng thử lại sau.'
      );
      consoleSpy.mockRestore();
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 when email or password is missing', async () => {
      const response1 = await loginDirect(post('/api/auth/login', JSON.stringify({ email: '' })));
      expect(response1.status).toBe(400);

      const response2 = await loginDirect(post('/api/auth/login', JSON.stringify({ email: 'test@example.com', password: '' })));
      expect(response2.status).toBe(400);
    });

    it('returns 401 when Supabase returns credentials error', async () => {
      const client = mocks.createClient();
      vi.mocked(client.auth.signInWithPassword).mockResolvedValue({
        data: { session: null } as any,
        error: { message: 'Invalid credentials' } as any,
      });

      const response = await loginDirect(post(
        '/api/auth/login', JSON.stringify({ email: 'test@example.com', password: 'wrong' })
      ));
      expect(response.status).toBe(401);
      expect((await response.json()).error).toBe('Invalid credentials');
    });

    it('returns 200 and session data on success', async () => {
      const client = mocks.createClient();
      vi.mocked(client.auth.signInWithPassword).mockResolvedValue({
        data: { session: { access_token: 'success-token' } } as any,
        error: null,
      });

      const response = await loginDirect(post(
        '/api/auth/login', JSON.stringify({ email: 'user@example.com', password: 'correct' })
      ));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.session.access_token).toBe('success-token');
    });
  });
});

function post(path: string, body: string, headers?: HeadersInit) {
  return new Request(`http://localhost${path}`, { method: 'POST', body, headers });
}

function resetInput() {
  return { password: 'Password123!', confirmPassword: 'Password123!' };
}
