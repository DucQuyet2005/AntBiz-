import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AccountSecurityError,
  AccountSecurityGatewayError,
} from '@/backend/modules/account-security/account-security-errors';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  securityModule: { changePassword: vi.fn() },
}));

vi.mock('@/lib/api/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/backend/modules/account-security/account-security-factory', () => ({
  createAccountSecurityModule: vi.fn(() => mocks.securityModule),
}));

import { POST } from '@/app/api/users/me/change-password/route';

describe('Change Password route contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      supabase: { kind: 'session' },
      user: { id: 'u1', email: 'user@example.com' },
      unauthorized: null,
    });
    mocks.securityModule.changePassword.mockResolvedValue(undefined);
  });

  it('authenticates before reading credential input', async () => {
    mocks.requireUser.mockResolvedValue({
      supabase: {}, user: null,
      unauthorized: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const response = await POST(request('{'));
    expect(response.status).toBe(401);
    expect(mocks.securityModule.changePassword).not.toHaveBeenCalled();
  });

  it('rejects authenticated users without an email', async () => {
    mocks.requireUser.mockResolvedValue({
      supabase: {}, user: { id: 'u1', email: undefined }, unauthorized: null,
    });
    const response = await POST(request(JSON.stringify(validInput())));
    expect(response.status).toBe(400);
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await POST(request('{'));
    expect(response.status).toBe(400);
    expect(mocks.securityModule.changePassword).not.toHaveBeenCalled();
  });

  it('delegates to the module and preserves the success response', async () => {
    const input = validInput();
    const response = await POST(request(JSON.stringify(input)));
    expect(mocks.securityModule.changePassword).toHaveBeenCalledWith(
      { id: 'u1', email: 'user@example.com' }, input
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
    });
  });

  it('maps validation and invalid credentials to 400', async () => {
    mocks.securityModule.changePassword.mockRejectedValueOnce(
      new AccountSecurityError(
        'VALIDATION', 400, 'New password should be different from the old password.'
      )
    );
    const same = await POST(request(JSON.stringify(validInput())));
    expect(same.status).toBe(400);
    expect((await same.json()).error).toBe(
      'New password should be different from the old password.'
    );

    mocks.securityModule.changePassword.mockRejectedValueOnce(
      new AccountSecurityError('INVALID_CREDENTIAL', 400, 'Mật khẩu hiện tại không chính xác.')
    );
    expect((await POST(request(JSON.stringify(validInput())))).status).toBe(400);
  });

  it('does not expose auth provider update errors', async () => {
    mocks.securityModule.changePassword.mockRejectedValue(
      new AccountSecurityGatewayError('updatePassword', new Error('provider secret'))
    );
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await POST(request(JSON.stringify(validInput())));
    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe('Không thể đổi mật khẩu. Vui lòng thử lại sau.');
    consoleSpy.mockRestore();
  });
});

function request(body: string) {
  return new Request('http://localhost/api/users/me/change-password', {
    method: 'POST', body,
  });
}

function validInput() {
  return { currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' };
}
