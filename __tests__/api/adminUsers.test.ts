import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  UserAccessAdministrationError,
  UserAccessAdministrationRepositoryError,
} from '@/backend/modules/user-access-administration/user-access-administration-errors';

const mocks = vi.hoisted(() => ({
  requireUserWithRole: vi.fn(),
  module: {
    listUsers: vi.fn(),
    assignRole: vi.fn(),
    changeStatus: vi.fn(),
  },
}));

vi.mock('@/lib/api/auth', () => ({ requireUserWithRole: mocks.requireUserWithRole }));
vi.mock('@/backend/modules/user-access-administration/user-access-administration-factory', () => ({
  createUserAccessAdministrationModule: vi.fn(() => mocks.module),
}));

import { GET } from '@/app/api/admin/users/route';
import { PUT as updateRole } from '@/app/api/admin/users/[id]/role/route';
import { PUT as updateStatus } from '@/app/api/admin/users/[id]/status/route';

describe('Admin user route contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUserWithRole.mockResolvedValue({
      supabase: { kind: 'session' },
      user: { id: 'admin-1', email: 'admin@example.com' },
      role: 'admin',
      unauthorized: null,
    });
    mocks.module.listUsers.mockResolvedValue({
      data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
    mocks.module.assignRole.mockResolvedValue({ unchanged: false });
    mocks.module.changeStatus.mockResolvedValue({ unchanged: false });
  });

  it('requires an administrator before listing users', async () => {
    mocks.requireUserWithRole.mockResolvedValue({
      supabase: {}, user: null, role: null,
      unauthorized: Response.json({ error: 'Forbidden' }, { status: 403 }),
    });
    const response = await GET(new NextRequest('http://localhost/api/admin/users'));
    expect(response.status).toBe(403);
    expect(mocks.module.listUsers).not.toHaveBeenCalled();
    expect(mocks.requireUserWithRole).toHaveBeenCalledWith(['admin']);
  });

  it('passes raw list query values and preserves the UI response', async () => {
    const expected = {
      data: [{ id: 'u2' }], meta: { total: 1, page: 2, limit: 5, totalPages: 1 },
    };
    mocks.module.listUsers.mockResolvedValue(expected);
    const response = await GET(new NextRequest(
      'http://localhost/api/admin/users?search=%20user%20&role=admin&status=active&page=2&limit=5'
    ));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expected);
    expect(mocks.module.listUsers).toHaveBeenCalledWith({
      search: ' user ', role: 'admin', status: 'active', page: '2', limit: '5',
    });
  });

  it('does not expose repository details from list failures', async () => {
    mocks.module.listUsers.mockRejectedValue(
      new UserAccessAdministrationRepositoryError('list', new Error('database secret'))
    );
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await GET(new NextRequest('http://localhost/api/admin/users'));
    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe('Không thể tải danh sách người dùng');
    consoleSpy.mockRestore();
  });

  it('returns 400 for malformed mutation JSON before calling the module', async () => {
    const response = await updateRole(request('/api/admin/users/u2/role', '{'), {
      params: Promise.resolve({ id: 'u2' }),
    });
    expect(response.status).toBe(400);
    expect(mocks.module.assignRole).not.toHaveBeenCalled();
  });

  it('awaits params and delegates role assignment with the admin actor', async () => {
    const response = await updateRole(request(
      '/api/admin/users/u2/role', JSON.stringify({ role: 'admin' })
    ), { params: Promise.resolve({ id: 'u2' }) });
    expect(response.status).toBe(200);
    expect(mocks.module.assignRole).toHaveBeenCalledWith(
      { id: 'admin-1', email: 'admin@example.com' }, 'u2', { role: 'admin' }
    );
    await expect(response.json()).resolves.toEqual({
      success: true, message: 'Role updated successfully',
    });
  });

  it('adds unchanged only for successful no-op mutations', async () => {
    mocks.module.assignRole.mockResolvedValue({ unchanged: true });
    const response = await updateRole(request(
      '/api/admin/users/u2/role', JSON.stringify({ role: 'marketer_full' })
    ), { params: Promise.resolve({ id: 'u2' }) });
    await expect(response.json()).resolves.toEqual({
      success: true, message: 'Role updated successfully', unchanged: true,
    });
  });

  it('maps self-mutation to forbidden', async () => {
    mocks.module.assignRole.mockRejectedValue(
      new UserAccessAdministrationError('FORBIDDEN', 403, 'Bạn không thể thay đổi vai trò của chính mình')
    );
    const response = await updateRole(request(
      '/api/admin/users/admin-1/role', JSON.stringify({ role: 'marketer_full' })
    ), { params: Promise.resolve({ id: 'admin-1' }) });
    expect(response.status).toBe(403);
  });

  it('delegates a status update and maps pending rejection to 400', async () => {
    const changed = await updateStatus(request(
      '/api/admin/users/u2/status',
      JSON.stringify({ status: 'locked', locked_reason: 'Repeated policy abuse' })
    ), { params: Promise.resolve({ id: 'u2' }) });
    expect(changed.status).toBe(200);
    expect(mocks.module.changeStatus).toHaveBeenCalledWith(
      { id: 'admin-1', email: 'admin@example.com' },
      'u2',
      { status: 'locked', locked_reason: 'Repeated policy abuse' }
    );

    mocks.module.changeStatus.mockRejectedValue(
      new UserAccessAdministrationError(
        'VALIDATION', 400, 'Trạng thái chỉ có thể là active hoặc locked'
      )
    );
    const pending = await updateStatus(request(
      '/api/admin/users/u2/status', JSON.stringify({ status: 'pending' })
    ), { params: Promise.resolve({ id: 'u2' }) });
    expect(pending.status).toBe(400);
  });
});

function request(path: string, body: string) {
  return new NextRequest(`http://localhost${path}`, { method: 'PUT', body });
}
