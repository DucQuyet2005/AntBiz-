import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  AuditReportingError,
  AuditReportingRepositoryError,
} from '@/backend/modules/audit-reporting/audit-reporting-errors';

const mocks = vi.hoisted(() => ({
  requireUserWithRole: vi.fn(),
  auditModule: { list: vi.fn() },
}));

vi.mock('@/lib/api/auth', () => ({ requireUserWithRole: mocks.requireUserWithRole }));
vi.mock('@/backend/modules/audit-reporting/audit-reporting-factory', () => ({
  createAuditReportingModule: vi.fn(() => mocks.auditModule),
}));

import { GET } from '@/app/api/admin/audit-logs/route';

describe('Admin audit log route contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUserWithRole.mockResolvedValue({
      supabase: { kind: 'session' }, user: { id: 'a1' }, role: 'admin', unauthorized: null,
    });
    mocks.auditModule.list.mockResolvedValue({
      data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
  });

  it('requires an administrator before querying reports', async () => {
    mocks.requireUserWithRole.mockResolvedValue({
      supabase: {}, user: null, role: null,
      unauthorized: Response.json({ error: 'Forbidden' }, { status: 403 }),
    });
    const response = await GET(request(''));
    expect(response.status).toBe(403);
    expect(mocks.auditModule.list).not.toHaveBeenCalled();
    expect(mocks.requireUserWithRole).toHaveBeenCalledWith(['admin']);
  });

  it('forwards raw query values and preserves the existing response', async () => {
    const expected = {
      data: [{ id: 'log-1', action: 'change_role' }],
      meta: { total: 1, page: 2, limit: 10, totalPages: 1 },
    };
    mocks.auditModule.list.mockResolvedValue(expected);
    const response = await GET(request(
      '?action=change_role&from=2026-07-01&to=2026-07-15&page=2&limit=10'
    ));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expected);
    expect(mocks.auditModule.list).toHaveBeenCalledWith({
      action: 'change_role', from: '2026-07-01', to: '2026-07-15',
      page: '2', limit: '10',
    });
  });

  it.each(['5', '10'])('keeps caller limit %s compatible', async (limit) => {
    await GET(request(`?limit=${limit}`));
    expect(mocks.auditModule.list).toHaveBeenCalledWith(expect.objectContaining({ limit }));
  });

  it('maps validation failures to 400', async () => {
    mocks.auditModule.list.mockRejectedValue(
      new AuditReportingError('VALIDATION', 400, 'limit không được vượt quá 100')
    );
    const response = await GET(request('?limit=101'));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('limit không được vượt quá 100');
  });

  it('does not expose repository details', async () => {
    mocks.auditModule.list.mockRejectedValue(
      new AuditReportingRepositoryError('list', new Error('database secret'))
    );
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await GET(request(''));
    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe('Không thể tải nhật ký hệ thống');
    consoleSpy.mockRestore();
  });
});

function request(query: string) {
  return new NextRequest(`http://localhost/api/admin/audit-logs${query}`);
}
