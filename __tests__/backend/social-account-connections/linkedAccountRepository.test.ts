import { describe, expect, it, vi } from 'vitest';
import { SupabaseLinkedAccountRepository } from '@/backend/modules/social-account-connections';

class QueryBuilder {
  select = vi.fn((_columns?: string) => this);
  eq = vi.fn((_column: string, _value: unknown) => this);
  upsert = vi.fn((_value: unknown, _options?: unknown) => this);
  delete = vi.fn(() => this);

  constructor(private response: { data: unknown; error: unknown }) {}

  then(resolve: (value: { data: unknown; error: unknown }) => unknown) {
    return Promise.resolve(this.response).then(resolve);
  }
}

describe('SupabaseLinkedAccountRepository', () => {
  it('lists a token-free public projection scoped to the user', async () => {
    const builder = new QueryBuilder({
      data: [{ id: '1', platform: 'facebook', account_id: 'page-1' }],
      error: null,
    });
    const supabase = { from: vi.fn(() => builder) };
    const repository = new SupabaseLinkedAccountRepository(supabase as never);

    await expect(repository.list('user-001')).resolves.toHaveLength(1);
    const selection = builder.select.mock.calls[0][0];
    expect(selection).not.toContain('access_token');
    expect(selection).not.toContain('refresh_token');
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-001');
  });

  it('upserts Threads using the compatibility platform value', async () => {
    const builder = new QueryBuilder({ data: null, error: null });
    const supabase = { from: vi.fn(() => builder) };
    const repository = new SupabaseLinkedAccountRepository(supabase as never);

    await expect(repository.upsert('user-001', {
      platform: 'threads',
      accountId: 'threads-1',
      accountName: 'thread_user',
      accessToken: 'secret-token',
    })).resolves.toBe(true);
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-001',
        platform: 'thread',
        account_id: 'threads-1',
        access_token: 'secret-token',
      }),
      { onConflict: 'user_id,platform,account_id' }
    );
  });

  it('returns a sanitized false outcome for an individual persistence failure', async () => {
    const builder = new QueryBuilder({ data: null, error: new Error('database secret') });
    const repository = new SupabaseLinkedAccountRepository({ from: () => builder } as never);
    await expect(repository.upsert('user-001', {
      platform: 'facebook', accountId: 'page-1', accountName: 'Page', accessToken: 'token',
    })).resolves.toBe(false);
  });

  it('disconnects only the user and validated stored platform', async () => {
    const builder = new QueryBuilder({ data: null, error: null });
    const repository = new SupabaseLinkedAccountRepository({ from: () => builder } as never);
    await repository.disconnect('user-001', 'instagram');
    expect(builder.delete).toHaveBeenCalledOnce();
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'user_id', 'user-001');
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'platform', 'instagram');
  });
});
