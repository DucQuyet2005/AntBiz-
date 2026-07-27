import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { CaptionExportRepositoryError } from '@/backend/modules/caption-export/caption-export-errors';
import {
  buildCaptionSearchFilter,
  SupabaseCaptionExportRepository,
} from '@/backend/modules/caption-export/caption-export-repository';

type Call = { method: string; args: unknown[] };

describe('SupabaseCaptionExportRepository', () => {
  it('applies identical normalized filters to count and list', async () => {
    const fake = fakeCaptionClient({ count: 2, data: [{ id: 'caption-1' }], error: null });
    const repository = new SupabaseCaptionExportRepository(fake.client);
    const filters = {
      platform: 'facebook',
      search: '50%_,(sale)\\',
      startDate: '2026-07-01T00:00:00.000Z',
      endDate: '2026-07-15T23:59:59.999Z',
    };

    await expect(repository.count(filters)).resolves.toBe(2);
    await expect(repository.list(filters, 50)).resolves.toEqual([{ id: 'caption-1' }]);

    expect(fake.queries).toHaveLength(2);
    for (const query of fake.queries) {
      expect(query.calls).toContainEqual({ method: 'eq', args: ['platform', 'facebook'] });
      expect(query.calls).toContainEqual({
        method: 'gte', args: ['created_at', '2026-07-01T00:00:00.000Z'],
      });
      expect(query.calls).toContainEqual({
        method: 'lte', args: ['created_at', '2026-07-15T23:59:59.999Z'],
      });
      const orCall = query.calls.find((call) => call.method === 'or');
      expect(orCall?.args[0]).toBe(buildCaptionSearchFilter(filters.search));
    }
    expect(fake.queries[0].calls).toContainEqual({
      method: 'select', args: ['id', { count: 'exact', head: true }],
    });
    expect(fake.queries[1].calls).toContainEqual({ method: 'limit', args: [50] });
  });

  it('quotes PostgREST grammar and escapes caller-controlled LIKE wildcards', () => {
    const filter = buildCaptionSearchFilter('50%_,(sale)\\');
    expect(filter).toContain('ai_content.ilike."');
    expect(filter).toContain('50\\\\%\\\\_,(sale)');
    expect(filter.endsWith('"')).toBe(true);
    expect(filter.split(',edited_content.ilike.')).toHaveLength(2);
  });

  it.each([
    ['count', 'count-captions'],
    ['list', 'list-captions'],
  ] as const)('maps a %s failure to %s', async (method, operation) => {
    const fake = fakeCaptionClient({ count: null, data: null, error: new Error('secret') });
    const repository = new SupabaseCaptionExportRepository(fake.client);
    const promise = method === 'count' ? repository.count({}) : repository.list({}, 10);
    await expect(promise).rejects.toBeInstanceOf(CaptionExportRepositoryError);
    await promise.catch((error: unknown) => expect(error).toMatchObject({ operation }));
  });
});

function fakeCaptionClient(result: { count: number | null; data: unknown[] | null; error: unknown }) {
  const queries: FakeCaptionQuery[] = [];
  const client = {
    from() {
      const query = new FakeCaptionQuery(result);
      queries.push(query);
      return query;
    },
  } as unknown as SupabaseClient;
  return { client, queries };
}

class FakeCaptionQuery implements PromiseLike<{
  count: number | null;
  data: unknown[] | null;
  error: unknown;
}> {
  readonly calls: Call[] = [];

  constructor(private readonly result: { count: number | null; data: unknown[] | null; error: unknown }) {}

  select(...args: unknown[]) { return this.record('select', args); }
  eq(...args: unknown[]) { return this.record('eq', args); }
  or(...args: unknown[]) { return this.record('or', args); }
  gte(...args: unknown[]) { return this.record('gte', args); }
  lte(...args: unknown[]) { return this.record('lte', args); }
  order(...args: unknown[]) { return this.record('order', args); }
  limit(...args: unknown[]) { return this.record('limit', args); }

  then<TResult1 = typeof this.result, TResult2 = never>(
    onfulfilled?: ((value: typeof this.result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }

  private record(method: string, args: unknown[]) {
    this.calls.push({ method, args });
    return this;
  }
}
