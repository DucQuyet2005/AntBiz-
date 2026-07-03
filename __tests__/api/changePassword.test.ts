import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as changePassword } from '@/app/api/users/me/change-password/route';

// Mock Supabase Server
const mockGetUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn().mockResolvedValue({ error: null });
const mockSupabaseServer = {
  auth: {
    getUser: mockGetUser,
    updateUser: mockUpdateUser,
    signInWithPassword: mockSignInWithPassword,
    signOut: mockSignOut,
  },
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => mockSupabaseServer,
}));

// Mock Supabase Admin
const mockAdminSignOut = vi.fn();
const mockSupabaseAdmin = {
  auth: {
    admin: {
      signOut: mockAdminSignOut,
    },
  },
};

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => mockSupabaseAdmin,
}));

// Mock Email Service
const mockSendEmail = vi.fn();
vi.mock('@/lib/email', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}));

describe('Change Password API - POST /api/users/me/change-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if user session is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Auth session missing' } });

    const req = new Request('http://localhost/api/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' }),
    });

    const res = await changePassword(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 400 if currentPassword or newPassword is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@example.com' } }, error: null });

    const req = new Request('http://localhost/api/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: '' }),
    });

    const res = await changePassword(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Mật khẩu hiện tại và mật khẩu mới là bắt buộc.');
  });

  it('returns 400 if current password verification fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@example.com' } }, error: null });
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });

    const req = new Request('http://localhost/api/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: 'WrongOldPassword123!', newPassword: 'NewPassword123!' }),
    });

    const res = await changePassword(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Mật khẩu hiện tại không chính xác.');
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'WrongOldPassword123!',
    });
  });

  it('returns 500 if updating user password fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@example.com' } }, error: null });
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockUpdateUser.mockResolvedValue({ error: { message: 'Password update rejected' } });

    const req = new Request('http://localhost/api/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' }),
    });

    const res = await changePassword(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Password update rejected');
  });

  it('returns 200 and invalidates tokens on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@example.com' } }, error: null });
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockUpdateUser.mockResolvedValue({ error: null });
    mockAdminSignOut.mockResolvedValue({ error: null });

    const req = new Request('http://localhost/api/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' }),
    });

    const res = await changePassword(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'NewPassword123!' });
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'global' });
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'test@example.com',
      subject: expect.stringContaining('thay đổi mật khẩu thành công'),
    }));
  });
});
