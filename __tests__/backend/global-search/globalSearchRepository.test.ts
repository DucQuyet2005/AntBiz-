import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { GlobalSearchRepositoryError } from '@/backend/modules/global-search/global-search-errors';
import {
  buildLiteralContainsPattern,
  quotePostgrestValue,
  SupabaseGlobalSearchRepository,
} from '@/backend/modules/global-search/global-search-repository';

type QueryResult = { data: unknown[] | null; error: unknown };
type RecordedCall = { table: string; method: string; args: unknown[] };

describe('Global Search PostgREST filters', () => {
  it('escapes LIKE wildcards and backslashes before adding contains wildcards', () => {
    expect(buildLiteralContainsPattern('50%_off\\today')).toBe('%50\\%\\_off\\\\today%');
  });

  it('quotes PostgREST grammar characters without changing commas or parentheses', () => {
    expect(quotePostgrestValue('%sale,(new)\\%')).toBe('"%sale,(new)\\\\%"');
  });

  it('refuses to place a double quote in raw PostgREST logical-filter syntax', () => {
    expect(() => quotePostgrestValue('%sale"%')).toThrow(/cannot be represented safely/);
  });
});

describe('SupabaseGlobalSearchRepository', () => {
  it('builds the administrator projection with caps and newest-first ordering', async () => {
    const fake = createFakeSupabase({
      users: { data: [{ id: 'user-1' }], error: null },
      audit_logs: { data: [{ id: 'log-1' }], error: null },
    });
    const repository = new SupabaseGlobalSearchRepository(fake.client);

    await expect(repository.searchAdmin('admin')).resolves.toEqual({
      users: [{ id: 'user-1' }],
      auditLogs: [{ id: 'log-1' }],
    });
    expect(fake.calls).toContainEqual({
      table: 'users', method: 'ilike', args: ['email', '%admin%'],
    });
    expect(fake.calls).toContainEqual({
      table: 'audit_logs', method: 'ilike', args: ['action', '%admin%'],
    });
    expectProjectionCaps(fake.calls, ['users', 'audit_logs']);
  });

  it('builds safe marketer filters and enforces prompt ownership', async () => {
    const fake = createFakeSupabase({
      articles: { data: [{ id: 'article-1' }], error: null },
      captions: { data: [{ id: 'caption-1' }], error: null },
      prompts: { data: [{ id: 'prompt-1' }], error: null },
    });
    const repository = new SupabaseGlobalSearchRepository(fake.client);

    await repository.searchMarketer('50%_,(x)\\', 'actor-1');

    const orCalls = fake.calls.filter((call) => call.method === 'or');
    expect(orCalls).toHaveLength(3);
    for (const call of orCalls) {
      const filter = String(call.args[0]);
      expect(filter).toContain('ilike."');
      expect(filter).toContain('50\\\\%\\\\_');
      expect(filter).toContain(',(');
      expect(filter).toContain('(x)');
    }
    expect(fake.calls).toContainEqual({
      table: 'prompts', method: 'eq', args: ['is_deleted', false],
    });
    expect(fake.calls).toContainEqual({
      table: 'prompts', method: 'eq', args: ['created_by', 'actor-1'],
    });
    expectProjectionCaps(fake.calls, ['articles', 'captions', 'prompts']);
  });

  it('uses parameterized direct filters and merges results when the query contains a quote', async () => {
    const fake = createFakeSupabase({
      articles: {
        data: [
          { id: 'article-1', title: 'Older', created_at: '2026-07-14T00:00:00.000Z' },
          { id: 'article-2', title: 'Newer', created_at: '2026-07-15T00:00:00.000Z' },
        ],
        error: null,
      },
      captions: { data: [{ id: 'caption-1', created_at: '2026-07-15T00:00:00.000Z' }], error: null },
      prompts: { data: [{ id: 'prompt-1', created_at: '2026-07-15T00:00:00.000Z' }], error: null },
    });
    const repository = new SupabaseGlobalSearchRepository(fake.client);

    const result = await repository.searchMarketer('say "hello"', 'actor-1');

    expect(fake.calls.some((call) => call.method === 'or')).toBe(false);
    expect(fake.calls.filter((call) => call.method === 'ilike')).toHaveLength(7);
    expect(result.articles).toEqual([
      { id: 'article-2', title: 'Newer' },
      { id: 'article-1', title: 'Older' },
    ]);
    expect(result.captions).toEqual([{ id: 'caption-1' }]);
    expect(result.prompts).toEqual([{ id: 'prompt-1' }]);
  });

  it.each([
    ['users', 'search-users'],
    ['audit_logs', 'search-audit-logs'],
  ] as const)('maps a %s failure to operation %s', async (table, operation) => {
    const fake = createFakeSupabase({
      users: { data: [], error: table === 'users' ? new Error('secret') : null },
      audit_logs: { data: [], error: table === 'audit_logs' ? new Error('secret') : null },
    });
    const repository = new SupabaseGlobalSearchRepository(fake.client);

    await expect(repository.searchAdmin('test')).rejects.toMatchObject({ operation });
  });

  it.each([
    ['articles', 'search-articles'],
    ['captions', 'search-captions'],
    ['prompts', 'search-prompts'],
  ] as const)('maps a %s failure to operation %s', async (table, operation) => {
    const fake = createFakeSupabase({
      articles: { data: [], error: table === 'articles' ? new Error('secret') : null },
      captions: { data: [], error: table === 'captions' ? new Error('secret') : null },
      prompts: { data: [], error: table === 'prompts' ? new Error('secret') : null },
    });
    const repository = new SupabaseGlobalSearchRepository(fake.client);

    await expect(repository.searchMarketer('test', 'actor-1')).rejects.toBeInstanceOf(
      GlobalSearchRepositoryError
    );
    await repository.searchMarketer('test', 'actor-1').catch((error: unknown) => {
      expect(error).toMatchObject({ operation });
    });
  });
});

function expectProjectionCaps(calls: RecordedCall[], tables: string[]) {
  for (const table of tables) {
    expect(calls).toContainEqual({
      table, method: 'order', args: ['created_at', { ascending: false }],
    });
    expect(calls).toContainEqual({ table, method: 'limit', args: [20] });
  }
}

function createFakeSupabase(results: Record<string, QueryResult>) {
  const calls: RecordedCall[] = [];
  const client = {
    from(table: string) {
      return new FakeQueryBuilder(table, results[table] ?? { data: [], error: null }, calls);
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

class FakeQueryBuilder implements PromiseLike<QueryResult> {
  constructor(
    private readonly table: string,
    private readonly result: QueryResult,
    private readonly calls: RecordedCall[]
  ) {}

  select(...args: unknown[]) { return this.record('select', args); }
  ilike(...args: unknown[]) { return this.record('ilike', args); }
  eq(...args: unknown[]) { return this.record('eq', args); }
  or(...args: unknown[]) { return this.record('or', args); }
  order(...args: unknown[]) { return this.record('order', args); }
  limit(...args: unknown[]) { return this.record('limit', args); }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }

  private record(method: string, args: unknown[]) {
    this.calls.push({ table: this.table, method, args });
    return this;
  }
}
