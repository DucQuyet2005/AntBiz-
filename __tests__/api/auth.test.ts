import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as forgotPassword } from '@/app/api/auth/forgot-password/route';
import { POST as resetPassword } from '@/app/api/auth/reset-password/route';

// Mock Supabase Admin
const mockGenerateLink = vi.fn();
const mockSupabaseAdmin = {
  auth: {
    admin: {
      generateLink: mockGenerateLink,
    },
  },
};

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => mockSupabaseAdmin,
}));

// Mock Supabase Server
const mockGetUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockSignOut = vi.fn();
const mockSupabaseServer = {
  auth: {
    getUser: mockGetUser,
    updateUser: mockUpdateUser,
    signOut: mockSignOut,
  },
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => mockSupabaseServer,
}));

// Mock Nodemailer
const mockSendMail = vi.fn();
vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: mockSendMail,
    }),
  },
}));

describe('Auth API - Forgot & Reset Password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/forgot-password', () => {
    it('returns 400 for invalid email', async () => {
      const req = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email' }),
      });
      const res = await forgotPassword(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Email không hợp lệ.');
    });

    it('returns 200 even if generateLink fails (security)', async () => {
      mockGenerateLink.mockResolvedValue({ data: null, error: { message: 'User not found' } });
      const req = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });
      const res = await forgotPassword(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toContain('Nếu tài khoản tồn tại');
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('returns 200 and sends email on success', async () => {
      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: 'fake-token' } },
        error: null,
      });
      mockSendMail.mockResolvedValue({});

      const req = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });
      const res = await forgotPassword(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toContain('Nếu tài khoản tồn tại');
      expect(mockSendMail).toHaveBeenCalled();
    });

    it('returns 500 on unexpected error', async () => {
      mockGenerateLink.mockImplementation(() => { throw new Error('Unexpected'); });
      const req = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });
      const res = await forgotPassword(req);
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('returns 400 for weak password', async () => {
      const req = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ password: '123', confirmPassword: '123' }),
      });
      const res = await resetPassword(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it('returns 400 for password mismatch', async () => {
      const req = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ password: 'Password123!', confirmPassword: 'DifferentPassword123!' }),
      });
      const res = await resetPassword(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Mật khẩu xác nhận không trùng khớp');
    });

    it('returns 401 if no user session found', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const req = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ password: 'Password123!', confirmPassword: 'Password123!' }),
      });
      const res = await resetPassword(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 on successful password update', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockUpdateUser.mockResolvedValue({ data: {}, error: null });
      mockSignOut.mockResolvedValue({ error: null });

      const req = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ password: 'Password123!', confirmPassword: 'Password123!' }),
      });
      const res = await resetPassword(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'Password123!' });
      expect(mockSignOut).toHaveBeenCalledWith({ scope: 'global' });
    });

    it('returns 400 if update fails', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockUpdateUser.mockResolvedValue({ data: null, error: { message: 'Invalid password' } });

      const req = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ password: 'Password123!', confirmPassword: 'Password123!' }),
      });
      const res = await resetPassword(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid password');
    });
  });
});
