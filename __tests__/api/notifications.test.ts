import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getNotifications, POST as postNotification } from '@/app/api/notifications/route';
import { PUT as readSingleNotification } from '@/app/api/notifications/[id]/read/route';
import { PUT as readAllNotifications } from '@/app/api/notifications/read-all/route';

// Mock Auth helper
const mockRequireUser = vi.fn();
vi.mock('@/lib/api/auth', () => ({
  requireUser: () => mockRequireUser(),
}));

// Mock notification service
const mockCreateNotification = vi.fn();
vi.mock('@/lib/services/notificationService', () => ({
  createNotification: (args: any) => mockCreateNotification(args),
}));

// Supabase client mocks
const mockRange = vi.fn();
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

const mockQueryBuilder = {
  select: mockSelect,
  update: mockUpdate,
  eq: mockEq,
  order: mockOrder,
  range: mockRange,
  single: mockSingle,
};

// Chains return the builder
mockSelect.mockReturnValue(mockQueryBuilder);
mockUpdate.mockReturnValue(mockQueryBuilder);
mockEq.mockReturnValue(mockQueryBuilder);
mockOrder.mockReturnValue(mockQueryBuilder);

const mockSupabaseServer = {
  from: vi.fn(() => mockQueryBuilder),
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => mockSupabaseServer,
}));

describe('Notifications API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock query responses
    mockRange.mockResolvedValue({ data: [], error: null, count: 0 });
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockCreateNotification.mockResolvedValue({ id: 'n1', title: 'Test' });
  });

  describe('GET /api/notifications', () => {
    it('returns 401 if user is unauthorized', async () => {
      mockRequireUser.mockResolvedValue({
        user: null,
        supabase: mockSupabaseServer,
        unauthorized: { status: 401, json: async () => ({ error: 'Unauthorized' }) },
      });

      const req = new Request('http://localhost/api/notifications?page=1&limit=10');
      const res = await getNotifications(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 and list of notifications for authenticated user', async () => {
      mockRequireUser.mockResolvedValue({
        user: { id: 'u1' },
        supabase: mockSupabaseServer,
        unauthorized: null,
      });

      const mockData = [
        { id: 'n1', title: 'Test', message: 'Hello', is_read: false, type: 'info', created_at: '2026-06-23T00:00:00Z' }
      ];
      mockRange.mockResolvedValue({ data: mockData, error: null, count: 1 });

      const req = new Request('http://localhost/api/notifications?page=1&limit=10&type=info');
      const res = await getNotifications(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toEqual(mockData);
      expect(json.count).toBe(1);
      expect(json.totalPages).toBe(1);
    });

    it('returns 500 if database query fails', async () => {
      mockRequireUser.mockResolvedValue({
        user: { id: 'u1' },
        supabase: mockSupabaseServer,
        unauthorized: null,
      });
      mockRange.mockResolvedValue({ data: null, error: { message: 'DB Read Error' }, count: 0 });

      const req = new Request('http://localhost/api/notifications?page=1&limit=10');
      const res = await getNotifications(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Không thể tải danh sách thông báo');
    });
  });

  describe('POST /api/notifications', () => {
    it('returns 401 if unauthorized and not service role', async () => {
      mockRequireUser.mockResolvedValue({
        user: null,
        supabase: mockSupabaseServer,
        unauthorized: { status: 401, json: async () => ({ error: 'Unauthorized' }) },
      });

      const req = new Request('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({ userId: 'u1', type: 'info', title: 'Test', message: 'Msg' }),
      });
      const res = await postNotification(req);
      expect(res.status).toBe(401);
    });

    it('successfully inserts notification when called by service role', async () => {
      const mockNotif = { id: 'n1', user_id: 'u1', type: 'info', title: 'Test', message: 'Msg' };
      mockCreateNotification.mockResolvedValue(mockNotif);

      const req = new Request('http://localhost/api/notifications', {
        method: 'POST',
        headers: {
          authorization: 'Bearer sb_secret_CmYMg8R7IAQzj_RyuKBDxQ_98WXMt0G',
        },
        body: JSON.stringify({ userId: 'u1', type: 'info', title: 'Test', message: 'Msg' }),
      });

      process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_CmYMg8R7IAQzj_RyuKBDxQ_98WXMt0G';

      const res = await postNotification(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('n1');
    });

    it('returns 400 if required fields are missing', async () => {
      mockRequireUser.mockResolvedValue({
        user: { id: 'u1' },
        supabase: mockSupabaseServer,
        unauthorized: null,
      });

      const req = new Request('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({ userId: 'u1', title: 'Test' }),
      });

      const res = await postNotification(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Thiếu các trường bắt buộc');
    });

    it('returns 500 if createNotification throws an error', async () => {
      mockRequireUser.mockResolvedValue({
        user: { id: 'u1' },
        supabase: mockSupabaseServer,
        unauthorized: null,
      });
      mockCreateNotification.mockRejectedValue(new Error('Insert DB failed'));

      const req = new Request('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({ userId: 'u1', type: 'info', title: 'Test', message: 'Msg' }),
      });

      const res = await postNotification(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Insert DB failed');
    });
  });

  describe('PUT /api/notifications/[id]/read', () => {
    it('marks a single notification as read', async () => {
      mockRequireUser.mockResolvedValue({
        user: { id: 'u1' },
        supabase: mockSupabaseServer,
        unauthorized: null,
      });

      const mockSingleNotif = { id: 'n1', user_id: 'u1', is_read: true };
      mockSingle.mockResolvedValue({ data: mockSingleNotif, error: null });

      const res = await readSingleNotification(
        new Request('http://localhost/api/notifications/n1/read', { method: 'PUT' }),
        { params: Promise.resolve({ id: 'n1' }) }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.is_read).toBe(true);
    });

    it('returns 500 if database update fails', async () => {
      mockRequireUser.mockResolvedValue({
        user: { id: 'u1' },
        supabase: mockSupabaseServer,
        unauthorized: null,
      });
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Update failed' } });

      const res = await readSingleNotification(
        new Request('http://localhost/api/notifications/n1/read', { method: 'PUT' }),
        { params: Promise.resolve({ id: 'n1' }) }
      );

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Không thể đánh dấu thông báo đã đọc');
    });
  });

  describe('PUT /api/notifications/read-all', () => {
    it('marks all user notifications as read', async () => {
      mockRequireUser.mockResolvedValue({
        user: { id: 'u1' },
        supabase: mockSupabaseServer,
        unauthorized: null,
      });

      const mockUpdatedList = [{ id: 'n1', is_read: true }, { id: 'n2', is_read: true }];
      mockSelect.mockResolvedValue({ data: mockUpdatedList, error: null });

      const res = await readAllNotifications(
        new Request('http://localhost/api/notifications/read-all', { method: 'PUT' })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.count).toBe(2);
      
      // Reset select back to builder for other tests
      mockSelect.mockReturnValue(mockQueryBuilder);
    });

    it('returns 500 if database batch update fails', async () => {
      mockRequireUser.mockResolvedValue({
        user: { id: 'u1' },
        supabase: mockSupabaseServer,
        unauthorized: null,
      });
      mockSelect.mockResolvedValue({ data: null, error: { message: 'Batch update failed' } });

      const res = await readAllNotifications(
        new Request('http://localhost/api/notifications/read-all', { method: 'PUT' })
      );

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Không thể đánh dấu tất cả thông báo đã đọc');
      
      mockSelect.mockReturnValue(mockQueryBuilder);
    });
  });
});
