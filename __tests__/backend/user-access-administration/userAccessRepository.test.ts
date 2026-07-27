import { describe, expect, it, vi } from 'vitest';
import { SupabaseUserAccessAdministrationRepository } from '@/backend/modules/user-access-administration/user-access-administration-repository';

describe('SupabaseUserAccessAdministrationRepository', () => {
  it('maps list filters, stable ordering, and pagination range', async () => {
    const query = listQuery({ data: [{ id: 'u1' }], count: 11, error: null });
    const repository = new SupabaseUserAccessAdministrationRepository(client(query) as never);
    await expect(repository.list({
      search: 'example', role: 'admin', status: 'active', page: 2, limit: 5,
    })).resolves.toEqual({ data: [{ id: 'u1' }], count: 11 });
    expect(query.select).toHaveBeenCalledWith(
      'id, email, role, status, created_at, last_login_at', { count: 'exact' }
    );
    expect(query.ilike).toHaveBeenCalledWith('email', '%example%');
    expect(query.eq).toHaveBeenCalledWith('role', 'admin');
    expect(query.eq).toHaveBeenCalledWith('status', 'active');
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(query.range).toHaveBeenCalledWith(5, 9);
  });

  it('maps an absent target to null and wraps lookup errors', async () => {
    const absent = lookupQuery({ data: null, error: null });
    await expect(new SupabaseUserAccessAdministrationRepository(client(absent) as never)
      .findById('missing')).resolves.toBeNull();

    const failed = lookupQuery({ data: null, error: new Error('database secret') });
    await expect(new SupabaseUserAccessAdministrationRepository(client(failed) as never)
      .findById('u1')).rejects.toMatchObject({ name: 'UserAccessAdministrationRepositoryError' });
  });

  it('maps role and status updates to database fields', async () => {
    const query = updateQuery();
    const repository = new SupabaseUserAccessAdministrationRepository(client(query) as never);
    await repository.updateRole('u1', 'admin');
    expect(query.update).toHaveBeenNthCalledWith(1, { role: 'admin' });
    expect(query.eq).toHaveBeenNthCalledWith(1, 'id', 'u1');

    await repository.updateStatus('u1', {
      status: 'locked', lockedReason: 'Repeated abuse',
      lockedAt: '2026-07-15T00:00:00.000Z', lockedBy: 'a1',
    });
    expect(query.update).toHaveBeenNthCalledWith(2, {
      status: 'locked', locked_reason: 'Repeated abuse',
      locked_at: '2026-07-15T00:00:00.000Z', locked_by: 'a1',
    });
  });

  it('wraps update failures without exposing the database error', async () => {
    const query = updateQuery(new Error('database secret'));
    const repository = new SupabaseUserAccessAdministrationRepository(client(query) as never);
    await expect(repository.updateRole('u1', 'admin')).rejects.toMatchObject({
      operation: 'updateRole', name: 'UserAccessAdministrationRepositoryError',
    });
  });
});

function client(query: Record<string, unknown>) {
  return { from: vi.fn(() => query) };
}

function listQuery(result: unknown) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  query.select = vi.fn(() => query);
  query.ilike = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.range = vi.fn().mockResolvedValue(result);
  return query;
}

function lookupQuery(result: unknown) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.maybeSingle = vi.fn().mockResolvedValue(result);
  return query;
}

function updateQuery(error: Error | null = null) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  query.update = vi.fn(() => query);
  query.eq = vi.fn().mockResolvedValue({ error });
  return query;
}
