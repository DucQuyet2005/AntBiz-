import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { ExportJobStoreError } from '@/backend/modules/caption-export/caption-export-errors';
import { AuditLogExportJobStore } from '@/backend/modules/caption-export/export-job-store';

const JOB_ID = '123e4567-e89b-12d3-a456-426614174000';
type Result = { data: unknown; error: unknown };
type Call = { method: string; args: unknown[] };

describe('AuditLogExportJobStore', () => {
  it('creates a pending compatibility job in audit_logs', async () => {
    const fake = fakeJobClient({
      single: [{ data: row({ status: 'pending', filters: { platform: 'facebook' } }), error: null }],
    });
    const store = new AuditLogExportJobStore(fake.client);
    const result = await store.create('user-1', { platform: 'facebook' });

    expect(result.id).toBe(JOB_ID);
    expect(fake.queries[0].table).toBe('audit_logs');
    expect(fake.queries[0].calls).toContainEqual({
      method: 'insert',
      args: [expect.objectContaining({
        actor_id: 'user-1',
        action: 'export_csv_job',
        after_value: expect.objectContaining({ status: 'pending', filters: { platform: 'facebook' } }),
      })],
    });
  });

  it('constrains job lookup by both id and export action', async () => {
    const fake = fakeJobClient({ maybeSingle: [{ data: row({ status: 'completed' }), error: null }] });
    const store = new AuditLogExportJobStore(fake.client);
    await store.find(JOB_ID);
    expect(fake.queries[0].calls).toContainEqual({ method: 'eq', args: ['id', JOB_ID] });
    expect(fake.queries[0].calls).toContainEqual({
      method: 'eq', args: ['action', 'export_csv_job'],
    });
  });

  it('returns null for a missing export job', async () => {
    const store = new AuditLogExportJobStore(fakeJobClient({
      maybeSingle: [{ data: null, error: null }],
    }).client);
    await expect(store.find(JOB_ID)).resolves.toBeNull();
  });

  it('preserves filters while completing a job', async () => {
    const fake = fakeJobClient({
      maybeSingle: [{ data: { after_value: { status: 'pending', filters: { search: 'sale' } } }, error: null }],
      awaited: [{ data: null, error: null }],
    });
    const store = new AuditLogExportJobStore(fake.client);
    await store.complete(JOB_ID, `/api/captions/export/download?jobId=${JOB_ID}`, 12);
    expect(fake.queries[1].calls).toContainEqual({
      method: 'update',
      args: [expect.objectContaining({
        after_value: expect.objectContaining({
          status: 'completed', filters: { search: 'sale' }, row_count: 12,
        }),
      })],
    });
    expect(fake.queries[1].calls).toContainEqual({
      method: 'eq', args: ['action', 'export_csv_job'],
    });
  });

  it('records a safe failed status while preserving filters', async () => {
    const fake = fakeJobClient({
      maybeSingle: [{ data: { after_value: { filters: { platform: 'threads' } } }, error: null }],
      awaited: [{ data: null, error: null }],
    });
    const store = new AuditLogExportJobStore(fake.client);
    await store.fail(JOB_ID, 'Export failed: list-captions');
    expect(fake.queries[1].calls).toContainEqual({
      method: 'update',
      args: [expect.objectContaining({
        after_value: expect.objectContaining({
          status: 'failed',
          error_message: 'Export failed: list-captions',
          filters: { platform: 'threads' },
        }),
      })],
    });
  });

  it('lists only the actor export jobs and maps the established history shape', async () => {
    const fake = fakeJobClient({ awaited: [{
      data: [row({
        status: 'completed',
        download_url: `/api/captions/export/download?jobId=${JOB_ID}`,
        row_count: 10,
        filters: { platform: 'facebook' },
      })],
      error: null,
    }] });
    const store = new AuditLogExportJobStore(fake.client);
    await expect(store.list('user-1')).resolves.toEqual([{
      id: JOB_ID,
      created_by: 'user-1',
      status: 'completed',
      download_url: `/api/captions/export/download?jobId=${JOB_ID}`,
      error_message: undefined,
      filters: { platform: 'facebook' },
      row_count: 10,
      created_at: '2026-07-15T00:00:00.000Z',
    }]);
    expect(fake.queries[0].calls).toContainEqual({ method: 'eq', args: ['actor_id', 'user-1'] });
    expect(fake.queries[0].calls).toContainEqual({
      method: 'eq', args: ['action', 'export_csv_job'],
    });
  });

  it.each(['single', 'maybeSingle', 'awaited'] as const)(
    'maps a %s database failure to a job-store error',
    async (terminal) => {
      const fake = fakeJobClient({ [terminal]: [{ data: null, error: new Error('secret') }] });
      const store = new AuditLogExportJobStore(fake.client);
      const promise = terminal === 'single'
        ? store.create('user-1', {})
        : terminal === 'maybeSingle'
          ? store.find(JOB_ID)
          : store.list('user-1');
      await expect(promise).rejects.toBeInstanceOf(ExportJobStoreError);
    }
  );
});

function row(afterValue: Record<string, unknown>) {
  return {
    id: JOB_ID,
    actor_id: 'user-1',
    action: 'export_csv_job',
    after_value: afterValue,
    created_at: '2026-07-15T00:00:00.000Z',
  };
}

function fakeJobClient(queues: {
  single?: Result[];
  maybeSingle?: Result[];
  awaited?: Result[];
}) {
  const state = {
    single: [...(queues.single ?? [])],
    maybeSingle: [...(queues.maybeSingle ?? [])],
    awaited: [...(queues.awaited ?? [])],
  };
  const queries: FakeJobQuery[] = [];
  const client = {
    from(table: string) {
      const query = new FakeJobQuery(table, state);
      queries.push(query);
      return query;
    },
  } as unknown as SupabaseClient;
  return { client, queries };
}

class FakeJobQuery implements PromiseLike<Result> {
  readonly calls: Call[] = [];

  constructor(
    readonly table: string,
    private readonly queues: { single: Result[]; maybeSingle: Result[]; awaited: Result[] }
  ) {}

  insert(...args: unknown[]) { return this.record('insert', args); }
  select(...args: unknown[]) { return this.record('select', args); }
  update(...args: unknown[]) { return this.record('update', args); }
  eq(...args: unknown[]) { return this.record('eq', args); }
  order(...args: unknown[]) { return this.record('order', args); }
  single() { return Promise.resolve(this.queues.single.shift() ?? { data: null, error: null }); }
  maybeSingle() { return Promise.resolve(this.queues.maybeSingle.shift() ?? { data: null, error: null }); }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    const result = this.queues.awaited.shift() ?? { data: null, error: null };
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }

  private record(method: string, args: unknown[]) {
    this.calls.push({ method, args });
    return this;
  }
}
