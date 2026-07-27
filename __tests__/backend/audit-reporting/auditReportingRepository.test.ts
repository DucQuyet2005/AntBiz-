import { describe, expect, it, vi } from 'vitest';
import { SupabaseAuditReportingRepository } from '@/backend/modules/audit-reporting/audit-reporting-repository';

describe('SupabaseAuditReportingRepository', () => {
  it('applies filters, exact count, stable ordering, and range', async () => {
    const query = fakeQuery({ data: [{ id: 'log-1' }], count: 11, error: null });
    const repository = new SupabaseAuditReportingRepository(client(query) as never);
    await expect(repository.list({
      action: 'change_role',
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-15T23:59:59.999Z',
      page: 2,
      limit: 5,
    })).resolves.toEqual({ data: [{ id: 'log-1' }], count: 11 });
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining('actor:users!'), {
      count: 'exact',
    });
    expect(query.eq).toHaveBeenCalledWith('action', 'change_role');
    expect(query.gte).toHaveBeenCalledWith('created_at', '2026-07-01T00:00:00.000Z');
    expect(query.lte).toHaveBeenCalledWith('created_at', '2026-07-15T23:59:59.999Z');
    expect(query.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false });
    expect(query.order).toHaveBeenNthCalledWith(2, 'id', { ascending: false });
    expect(query.range).toHaveBeenCalledWith(5, 9);
  });

  it('skips absent optional filters', async () => {
    const query = fakeQuery({ data: [], count: 0, error: null });
    const repository = new SupabaseAuditReportingRepository(client(query) as never);
    await repository.list({ page: 1, limit: 20 });
    expect(query.eq).not.toHaveBeenCalled();
    expect(query.gte).not.toHaveBeenCalled();
    expect(query.lte).not.toHaveBeenCalled();
  });

  it('wraps persistence failures', async () => {
    const query = fakeQuery({ data: null, count: null, error: new Error('database secret') });
    const repository = new SupabaseAuditReportingRepository(client(query) as never);
    await expect(repository.list({ page: 1, limit: 20 })).rejects.toMatchObject({
      name: 'AuditReportingRepositoryError', operation: 'list',
    });
  });
});

function client(query: Record<string, unknown>) {
  return { from: vi.fn(() => query) };
}

function fakeQuery(result: unknown) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.gte = vi.fn(() => query);
  query.lte = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.range = vi.fn().mockResolvedValue(result);
  return query;
}
