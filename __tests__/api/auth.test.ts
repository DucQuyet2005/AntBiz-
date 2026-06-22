import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as forgotPassword } from '@/app/api/auth/forgot-password/route';
import { POST as resetPassword } from '@/app/api/auth/reset-password/route';
import { GET as confirmAuth } from '@/app/api/auth/confirm/route';

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
const mockVerifyOtp = vi.fn();
const mockSupabaseServer = {
  auth: {
    getUser: mockGetUser,
    updateUser: mockUpdateUser,
    signOut: mockSignOut,
    verifyOtp: mockVerifyOtp,
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

describe('Auth API - Forgot, Confirm & Reset Password', () => {
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
  });

  describe('GET /api/auth/confirm', () => {
    it('redirects to reset-password on successful recovery verification', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      const url = 'http://localhost/api/auth/confirm?token_hash=token&type=recovery&next=/reset-password';
      
      // Mock NextRequest since the route uses it
      const req = {
        url,
        nextUrl: new URL(url),
      };
      // URL objects in Node don't have clone(), so we add it
      (req.nextUrl as any).clone = () => new URL(url);

      const res = await confirmAuth(req as any);
      expect(res.status).toBe(307); 
      expect(res.headers.get('location')).toContain('/reset-password');
      expect(mockVerifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'token' });
    });

    it('redirects to login with error if verification fails', async () => {
      mockVerifyOtp.mockResolvedValue({ error: { message: 'Invalid token' } });
      const url = 'http://localhost/api/auth/confirm?token_hash=wrong&type=recovery';
      
      const req = {
        url,
        nextUrl: new URL(url),
      };
      (req.nextUrl as any).clone = () => new URL(url);

      const res = await confirmAuth(req as any);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/login');
      expect(res.headers.get('location')).toContain('error=');
    });
  });

  describe('POST /api/auth/reset-password', () => {
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
  });
});
