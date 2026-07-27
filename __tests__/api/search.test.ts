import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as handleSearch } from '@/app/api/search/route';

type QueryCall = { table: string; method: string; args: unknown[] };

let currentRole = 'marketer_full';
let mockErrorTable: string | null = null;
let mockArticlesDb: unknown[] = [];
let mockCaptionsDb: unknown[] = [];
let mockPromptsDb: unknown[] = [];
let mockUsersDb: unknown[] = [];
let mockAuditLogsDb: unknown[] = [];
let queryCalls: QueryCall[] = [];

class MockQueryBuilder implements PromiseLike<{ data: unknown; error: unknown }> {
  constructor(private readonly table: string) {}

  select(...args: unknown[]) { return this.record('select', args); }
  eq(...args: unknown[]) { return this.record('eq', args); }
  ilike(...args: unknown[]) { return this.record('ilike', args); }
  or(...args: unknown[]) { return this.record('or', args); }
  order(...args: unknown[]) { return this.record('order', args); }
  limit(...args: unknown[]) { return this.record('limit', args); }

  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    const result = mockErrorTable === this.table
      ? { data: null, error: new Error('Database secret') }
      : { data: tableData(this.table), error: null };
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }

  async single() {
    if (this.table === 'users') {
      return { data: { role: currentRole }, error: null };
    }
    return { data: null, error: null };
  }

  private record(method: string, args: unknown[]) {
    queryCalls.push({ table: this.table, method, args });
    return this;
  }
}

const mockGetUser = vi.fn();
const mockSupabaseClient = {
  auth: { getUser: mockGetUser },
  from: (table: string) => new MockQueryBuilder(table),
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => mockSupabaseClient,
}));

vi.mock('next/headers', () => ({
  cookies: () => ({ getAll: () => [], setAll: () => {} }),
}));

describe('GET /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentRole = 'marketer_full';
    mockErrorTable = null;
    mockArticlesDb = [];
    mockCaptionsDb = [];
    mockPromptsDb = [];
    mockUsersDb = [];
    mockAuditLogsDb = [];
    queryCalls = [];
  });

  it('returns 401 when the requester is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') });
    const response = await handleSearch(request('test'));
    expect(response.status).toBe(401);
  });

  it('returns 403 when the requester has an unsupported role', async () => {
    authenticate('viewer');
    const response = await handleSearch(request('test'));
    expect(response.status).toBe(403);
  });

  it.each(['', '   '])('returns 400 for an empty query (%s)', async (query) => {
    authenticate('marketer_full');
    const response = await handleSearch(request(query));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('không hợp lệ'),
    });
  });

  it('returns 400 when the query exceeds 200 characters', async () => {
    authenticate('marketer_full');
    const response = await handleSearch(request('x'.repeat(201)));
    expect(response.status).toBe(400);
  });

  it('preserves the marketer response and prompt ownership filters', async () => {
    authenticate('marketer_content');
    mockArticlesDb = [{ id: 'article-1', title: 'Tet Nguyen Dan 2026' }];
    mockCaptionsDb = [{ id: 'caption-1', platform: 'facebook' }];
    mockPromptsDb = [{ id: 'prompt-1', name: 'Tet prompt' }];

    const response = await handleSearch(request('tet', 'en'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      articles: mockArticlesDb,
      captions: mockCaptionsDb,
      prompts: mockPromptsDb,
      faqs: expect.any(Array),
    });
    expect(queryCalls).toContainEqual({
      table: 'prompts', method: 'eq', args: ['is_deleted', false],
    });
    expect(queryCalls).toContainEqual({
      table: 'prompts', method: 'eq', args: ['created_by', 'user-1'],
    });
  });

  it('preserves the administrator response without marketer categories', async () => {
    authenticate('admin');
    mockUsersDb = [{ id: 'user-2', email: 'person@example.com' }];
    mockAuditLogsDb = [{ id: 'log-1', action: 'change_role' }];

    const response = await handleSearch(request('person'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ users: mockUsersDb, auditLogs: mockAuditLogsDb, faqs: [] });
    expect(body).not.toHaveProperty('articles');
    expect(queryCalls.some((call) => call.table === 'articles')).toBe(false);
  });

  it('falls back to Vietnamese FAQ search for an unsupported language', async () => {
    authenticate('marketer_full');
    const response = await handleSearch(request('gocnhinmoi', 'fr'));
    const body = await response.json();
    expect(body.faqs.length).toBeGreaterThan(0);
    expect(body.faqs[0]).toMatchObject({ key: 'harvesting_1' });
  });

  it('quotes reserved PostgREST characters in marketer OR filters', async () => {
    authenticate('marketer_full');
    await handleSearch(request('sale,(new)_50%\\'));
    const filters = queryCalls
      .filter((call) => call.method === 'or')
      .map((call) => String(call.args[0]));
    expect(filters).toHaveLength(3);
    for (const filter of filters) {
      expect(filter).toContain('ilike."');
      expect(filter).toContain('sale,(new)\\\\_50\\\\%');
    }
  });

  it('keeps double quotes out of raw OR syntax by using direct filters', async () => {
    authenticate('marketer_full');
    const response = await handleSearch(request('say "hello"'));
    expect(response.status).toBe(200);
    expect(queryCalls.some((call) => call.method === 'or')).toBe(false);
    expect(queryCalls.filter((call) => call.method === 'ilike')).toHaveLength(7);
  });

  it('returns a generic 500 response when one projection fails', async () => {
    authenticate('marketer_full');
    mockErrorTable = 'captions';
    const response = await handleSearch(request('test'));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Không thể thực hiện tìm kiếm toàn cục',
    });
  });
});

function authenticate(role: string) {
  currentRole = role;
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
}

function request(query: string, language?: string) {
  const url = new URL('http://localhost/api/search');
  url.searchParams.set('q', query);
  if (language) url.searchParams.set('lang', language);
  return new NextRequest(url);
}

function tableData(table: string) {
  if (table === 'articles') return mockArticlesDb;
  if (table === 'captions') return mockCaptionsDb;
  if (table === 'prompts') return mockPromptsDb;
  if (table === 'users') return mockUsersDb;
  if (table === 'audit_logs') return mockAuditLogsDb;
  return [];
}
