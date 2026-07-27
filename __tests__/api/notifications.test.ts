import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { NotificationError, NotificationRepositoryError } from '@/backend/modules/notifications/errors';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createAdminClient: vi.fn(() => ({ kind: 'admin' })),
  module: {
    listInbox: vi.fn(),
    createForUser: vi.fn(),
    createInternal: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

vi.mock('@/lib/api/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock('@/backend/modules/notifications/notification-factory', () => ({
  createNotificationModule: vi.fn(() => mocks.module),
}));

import { GET, POST } from '@/app/api/notifications/route';
import { PUT as markRead } from '@/app/api/notifications/[id]/read/route';
import { PUT as markAllRead } from '@/app/api/notifications/read-all/route';

describe('Notification route contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    mocks.requireUser.mockResolvedValue({
      user: { id: 'u1' }, supabase: { kind: 'session' }, unauthorized: null,
    });
    mocks.module.listInbox.mockResolvedValue({
      data: [], count: 0, page: 1, limit: 10, totalPages: 0,
    });
    mocks.module.createForUser.mockResolvedValue({ id: 'n1' });
    mocks.module.createInternal.mockResolvedValue({ id: 'n1' });
    mocks.module.markRead.mockResolvedValue({ id: 'n1', is_read: true });
    mocks.module.markAllRead.mockResolvedValue(2);
  });

  it('returns the existing unauthorized response', async () => {
    mocks.requireUser.mockResolvedValue({
      user: null,
      supabase: {},
      unauthorized: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    expect((await GET(new NextRequest('http://localhost/api/notifications'))).status).toBe(401);
  });

  it('passes list query values and preserves the pagination response', async () => {
    const expected = { data: [{ id: 'n1' }], count: 1, page: 2, limit: 5, totalPages: 1 };
    mocks.module.listInbox.mockResolvedValue(expected);
    const response = await GET(new NextRequest(
      'http://localhost/api/notifications?page=2&limit=5&category=prompt'
    ));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expected);
    expect(mocks.module.listInbox).toHaveBeenCalledWith('u1', {
      page: '2', limit: '5', category: 'prompt', type: null,
    });
  });

  it('maps validation and repository failures without exposing raw errors', async () => {
    mocks.module.listInbox.mockRejectedValueOnce(
      new NotificationError('VALIDATION', 400, 'page và limit phải là số nguyên dương')
    );
    const invalid = await GET(new NextRequest('http://localhost/api/notifications?page=0'));
    expect(invalid.status).toBe(400);

    mocks.module.listInbox.mockRejectedValueOnce(
      new NotificationRepositoryError('list', new Error('database secret'))
    );
    const failed = await GET(new NextRequest('http://localhost/api/notifications'));
    expect(failed.status).toBe(500);
    expect((await failed.json()).error).toBe('Không thể tải danh sách thông báo');
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await POST(new NextRequest('http://localhost/api/notifications', {
      method: 'POST', body: '{',
    }));
    expect(response.status).toBe(400);
    expect(mocks.module.createForUser).not.toHaveBeenCalled();
  });

  it('authenticates non-service POST requests before reading the body', async () => {
    mocks.requireUser.mockResolvedValue({
      user: null,
      supabase: {},
      unauthorized: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const response = await POST(new NextRequest('http://localhost/api/notifications', {
      method: 'POST', body: '{',
    }));
    expect(response.status).toBe(401);
  });

  it('creates through the authenticated-user workflow', async () => {
    const body = { userId: 'u1', type: 'info', title: 'Title', message: 'Message' };
    const response = await POST(new NextRequest('http://localhost/api/notifications', {
      method: 'POST', body: JSON.stringify(body),
    }));
    expect(response.status).toBe(201);
    expect(mocks.module.createForUser).toHaveBeenCalledWith('u1', body);
  });

  it('uses the internal workflow for a valid service-role token', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-secret';
    const body = { userId: 'u2', type: 'info', title: 'Title', message: 'Message' };
    const response = await POST(new NextRequest('http://localhost/api/notifications', {
      method: 'POST',
      headers: { authorization: 'Bearer service-secret' },
      body: JSON.stringify(body),
    }));
    expect(response.status).toBe(201);
    expect(mocks.module.createInternal).toHaveBeenCalledWith(body);
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });

  it('does not treat an invalid service token as system access', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-secret';
    await POST(new NextRequest('http://localhost/api/notifications', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret' },
      body: JSON.stringify({ userId: 'u1', type: 'info', title: 'T', message: 'M' }),
    }));
    expect(mocks.requireUser).toHaveBeenCalled();
    expect(mocks.module.createInternal).not.toHaveBeenCalled();
  });

  it('awaits params and marks one notification read', async () => {
    const response = await markRead(
      new NextRequest('http://localhost/api/notifications/n1/read', { method: 'PUT' }),
      { params: Promise.resolve({ id: 'n1' }) }
    );
    expect(response.status).toBe(200);
    expect(mocks.module.markRead).toHaveBeenCalledWith('u1', 'n1');
  });

  it('maps a foreign or missing notification to 404', async () => {
    mocks.module.markRead.mockRejectedValue(
      new NotificationError('NOT_FOUND', 404, 'Không tìm thấy thông báo')
    );
    const response = await markRead(
      new NextRequest('http://localhost/api/notifications/n1/read', { method: 'PUT' }),
      { params: Promise.resolve({ id: 'n1' }) }
    );
    expect(response.status).toBe(404);
  });

  it('marks all notifications read and preserves the count response', async () => {
    const response = await markAllRead(new NextRequest(
      'http://localhost/api/notifications/read-all', { method: 'PUT' }
    ));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, count: 2 });
  });
});
