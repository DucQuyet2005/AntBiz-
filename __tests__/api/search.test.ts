import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as handleSearch } from '@/app/api/search/route';

let currentRole = 'marketer_full';
let mockError = false;
let mockArticlesDb: any[] = [];
let mockCaptionsDb: any[] = [];
let mockPromptsDb: any[] = [];

class MockQueryBuilder {
  constructor(private table: string) {}

  select(columns?: string, options?: any) {
    return this;
  }

  eq(column: string, value: any) {
    return this;
  }

  or(expr: string) {
    return this;
  }

  order(column: string, options?: any) {
    return this;
  }

  limit(value: number) {
    return this;
  }

  then(onfulfilled: any) {
    let result: any = { data: null, error: null };

    if (this.table === 'users') {
      result = { data: { role: currentRole }, error: null };
    } else if (mockError) {
      result = { data: null, error: new Error('Database error') };
    } else if (this.table === 'articles') {
      result = { data: mockArticlesDb, error: null };
    } else if (this.table === 'captions') {
      result = { data: mockCaptionsDb, error: null };
    } else if (this.table === 'prompts') {
      result = { data: mockPromptsDb, error: null };
    }

    return Promise.resolve(result).then(onfulfilled);
  }

  async single() {
    if (this.table === 'users') {
      return { data: { role: currentRole }, error: null };
    }
    if (mockError) {
      return { data: null, error: new Error('Database error') };
    }
    return { data: null, error: null };
  }
}

const mockGetUser = vi.fn();
const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: (table: string) => new MockQueryBuilder(table),
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => mockSupabaseClient,
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [],
    setAll: () => {},
  }),
}));

describe('Search API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentRole = 'marketer_full';
    mockError = false;
    mockArticlesDb = [];
    mockCaptionsDb = [];
    mockPromptsDb = [];
  });

  it('returns 401 if not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') });
    const req = new NextRequest('http://localhost/api/search?q=test');
    const res = await handleSearch(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 if user does not have an authorized role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    currentRole = 'viewer';
    const req = new NextRequest('http://localhost/api/search?q=test');
    const res = await handleSearch(req);
    expect(res.status).toBe(403);
  });

  it('returns 400 if search query parameter q is missing or empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    currentRole = 'marketer_full';
    const req = new NextRequest('http://localhost/api/search?q=');
    const res = await handleSearch(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('không hợp lệ');
  });

  it('returns 200 with search results on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    currentRole = 'marketer_full';

    mockArticlesDb = [{ id: 'a1', title: 'Tet Nguyen Dan 2026' }];
    mockCaptionsDb = [{ id: 'c1', platform: 'facebook', ai_content: 'Tet content here' }];
    mockPromptsDb = [{ id: 'p1', name: 'Tet prompt', content: 'test content' }];

    const req = new NextRequest('http://localhost/api/search?q=tet');
    const res = await handleSearch(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.articles).toHaveLength(1);
    expect(json.captions).toHaveLength(1);
    expect(json.prompts).toHaveLength(1);
    expect(json.articles[0].title).toBe('Tet Nguyen Dan 2026');
  });

  it('returns matching FAQ questions/answers in-memory', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    currentRole = 'marketer_full';

    const req = new NextRequest('http://localhost/api/search?q=gocnhinmoi');
    const res = await handleSearch(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.faqs.length).toBeGreaterThan(0);
    expect(json.faqs[0].question.toLowerCase()).toContain('gocnhinmoi');
  });

  it('returns 500 if database error occurs', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    currentRole = 'marketer_full';
    mockError = true;

    const req = new NextRequest('http://localhost/api/search?q=test');
    const res = await handleSearch(req);
    expect(res.status).toBe(500);
  });
});
