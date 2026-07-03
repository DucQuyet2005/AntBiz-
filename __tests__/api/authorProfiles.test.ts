import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getProfiles, POST as createProfile } from '@/app/api/author-profiles/route';
import { PUT as updateProfile, DELETE as deleteProfile } from '@/app/api/author-profiles/[id]/route';
import { POST as trainProfile } from '@/app/api/author-profiles/[id]/train/route';

let currentRole = 'marketer_full';
let mockError = false;
let mockAuthorProfilesDb: any[] = [];

// Mock query builder for Supabase
class MockQueryBuilder {
  private filters: Array<{ col: string; val: any; type: 'eq' | 'neq' }> = [];
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private actionData: any = null;

  constructor(private table: string) {}

  select(columns?: string) {
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ col: column, val: value, type: 'eq' });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ col: column, val: value, type: 'neq' });
    return this;
  }

  order(column: string, options?: any) {
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.actionData = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.actionData = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  private execute(): any[] {
    if (mockError && this.table !== 'users') {
      throw new Error('Database error');
    }

    if (this.table === 'users') {
      return [{ role: currentRole }];
    }

    if (this.table !== 'author_profiles') {
      return [];
    }

    if (this.action === 'insert') {
      const records = Array.isArray(this.actionData) ? this.actionData : [this.actionData];
      const inserted = records.map((r, i) => ({
        id: r.id || `ap-${mockAuthorProfilesDb.length + i + 1}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tuned_model_id: null,
        sample_posts: [],
        tuning_status: 'pending',
        ...r,
      }));
      mockAuthorProfilesDb.push(...inserted);
      this.filters = [{ col: 'id', val: inserted[0].id, type: 'eq' }];
      this.action = 'select';
    }

    const getFiltered = () => {
      return mockAuthorProfilesDb.filter((r) => {
        for (const filter of this.filters) {
          if (filter.type === 'eq' && r[filter.col] !== filter.val) return false;
          if (filter.type === 'neq' && r[filter.col] === filter.val) return false;
        }
        return true;
      });
    };

    if (this.action === 'update') {
      const targets = getFiltered();
      targets.forEach((r) => {
        const idx = mockAuthorProfilesDb.findIndex((dbR) => dbR.id === r.id);
        if (idx !== -1) {
          mockAuthorProfilesDb[idx] = {
            ...mockAuthorProfilesDb[idx],
            ...this.actionData,
            updated_at: new Date().toISOString(),
          };
        }
      });
      this.action = 'select';
      return getFiltered();
    }

    if (this.action === 'delete') {
      const targets = getFiltered();
      targets.forEach((r) => {
        mockAuthorProfilesDb = mockAuthorProfilesDb.filter((dbR) => dbR.id !== r.id);
      });
      this.action = 'select';
      return [{ deleted: true }];
    }

    return getFiltered();
  }

  then(onfulfilled: any) {
    try {
      const data = this.execute();
      return Promise.resolve({ data, error: null }).then(onfulfilled);
    } catch (e: any) {
      return Promise.resolve({ data: null, error: e }).then(onfulfilled);
    }
  }

  async single() {
    try {
      const data = this.execute();
      if (data.length === 0) {
        return { data: null, error: new Error('Not found') };
      }
      return { data: data[0], error: null };
    } catch (e: any) {
      return { data: null, error: e };
    }
  }

  async maybeSingle() {
    try {
      const data = this.execute();
      return { data: data[0] || null, error: null };
    } catch (e: any) {
      return { data: null, error: e };
    }
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

// Mock global fetch for Google AI Studio REST calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crawler
const mockCrawlUrl = vi.fn();
const mockPreprocessArticle = vi.fn();
vi.mock('@/lib/crawler', () => ({
  crawlUrl: (...args: any[]) => mockCrawlUrl(...args),
}));
vi.mock('@/lib/crawler/preprocess', () => ({
  preprocessArticle: (...args: any[]) => mockPreprocessArticle(...args),
}));

describe('Author Profiles API Endpoints (US-2.09)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    currentRole = 'marketer_full';
    mockError = false;
    mockAuthorProfilesDb = [];
    process.env.GEMINI_API_KEY = 'mock-key';

    // Mock fetch default implementation
    mockFetch.mockReset();
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('tunedModels')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ name: 'tunedModels/mock-tuned-id' }),
          text: async () => JSON.stringify({ name: 'tunedModels/mock-tuned-id' }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => '{}',
      } as Response;
    });
  });

  describe('GET /api/author-profiles', () => {
    it('returns 401 if unauthorized', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') });
      const req = new NextRequest('http://localhost/api/author-profiles');
      const res = await getProfiles(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 with author profiles of current user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockAuthorProfilesDb = [
        { id: 'ap1', user_id: 'u1', name: 'Author 1', tuning_status: 'ready' },
        { id: 'ap2', user_id: 'u2', name: 'Author 2', tuning_status: 'ready' },
      ];

      const req = new NextRequest('http://localhost/api/author-profiles');
      const res = await getProfiles(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe('ap1');
    });

    it('returns 500 if database error occurs', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockError = true;
      const req = new NextRequest('http://localhost/api/author-profiles');
      const res = await getProfiles(req);
      expect(res.status).toBe(500);
    });

    it('returns 500 on unexpected exception', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      vi.spyOn(mockSupabaseClient, 'from').mockImplementationOnce(() => {
        throw new Error('Unexpected crash');
      });
      const req = new NextRequest('http://localhost/api/author-profiles');
      const res = await getProfiles(req);
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/author-profiles', () => {
    it('returns 400 if name is empty', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const req = new NextRequest('http://localhost/api/author-profiles', {
        method: 'POST',
        body: JSON.stringify({ name: '', source_url: 'https://gocnhinmoi.com.vn' }),
      });
      const res = await createProfile(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 if body is invalid JSON', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const req = new NextRequest('http://localhost/api/author-profiles', {
        method: 'POST',
        body: 'invalid-json',
      });
      const res = await createProfile(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 if profile name already exists for same user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockAuthorProfilesDb = [
        { id: 'ap1', user_id: 'u1', name: 'Dup Author' },
      ];

      const req = new NextRequest('http://localhost/api/author-profiles', {
        method: 'POST',
        body: JSON.stringify({ name: 'Dup Author' }),
      });
      const res = await createProfile(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('đã tồn tại');
    });

    it('creates author profile successfully', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const req = new NextRequest('http://localhost/api/author-profiles', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Author', source_url: 'https://gocnhinmoi.com.vn' }),
      });
      const res = await createProfile(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.name).toBe('New Author');
      expect(json.data.source_url).toBe('https://gocnhinmoi.com.vn');
    });

    it('returns 500 if database error occurs', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockError = true;
      const req = new NextRequest('http://localhost/api/author-profiles', {
        method: 'POST',
        body: JSON.stringify({ name: 'Error Author' }),
      });
      const res = await createProfile(req);
      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/author-profiles/[id]', () => {
    it('returns 403 if user is not the owner', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockAuthorProfilesDb = [
        { id: 'ap1', user_id: 'u2', name: 'Author 1' },
      ];

      const req = new NextRequest('http://localhost/api/author-profiles/ap1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'New Name' }),
      });
      const res = await updateProfile(req, { params: Promise.resolve({ id: 'ap1' }) });
      expect(res.status).toBe(403);
    });

    it('returns 400 if name is empty', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockAuthorProfilesDb = [
        { id: 'ap1', user_id: 'u1', name: 'Author 1' },
      ];
      const req = new NextRequest('http://localhost/api/author-profiles/ap1', {
        method: 'PUT',
        body: JSON.stringify({ name: '' }),
      });
      const res = await updateProfile(req, { params: Promise.resolve({ id: 'ap1' }) });
      expect(res.status).toBe(400);
    });

    it('returns 400 if name already exists for another profile', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockAuthorProfilesDb = [
        { id: 'ap1', user_id: 'u1', name: 'Author 1' },
        { id: 'ap2', user_id: 'u1', name: 'Dup Author' },
      ];
      const req = new NextRequest('http://localhost/api/author-profiles/ap1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Dup Author' }),
      });
      const res = await updateProfile(req, { params: Promise.resolve({ id: 'ap1' }) });
      expect(res.status).toBe(400);
    });

    it('updates author profile successfully', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockAuthorProfilesDb = [
        { id: 'ap1', user_id: 'u1', name: 'Author 1', tuning_status: 'pending' },
      ];

      const req = new NextRequest('http://localhost/api/author-profiles/ap1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Author', tuning_status: 'ready' }),
      });
      const res = await updateProfile(req, { params: Promise.resolve({ id: 'ap1' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.name).toBe('Updated Author');
      expect(json.data.tuning_status).toBe('ready');
    });

    it('returns 404 if database error occurs during fetch', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockError = true;
      const req = new NextRequest('http://localhost/api/author-profiles/ap1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Error Update' }),
      });
      const res = await updateProfile(req, { params: Promise.resolve({ id: 'ap1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 500 on unexpected exception during update', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      vi.spyOn(mockSupabaseClient, 'from').mockImplementationOnce(() => {
        throw new Error('Unexpected crash');
      });
      const req = new NextRequest('http://localhost/api/author-profiles/ap1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Update Crash' }),
      });
      const res = await updateProfile(req, { params: Promise.resolve({ id: 'ap1' }) });
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /api/author-profiles/[id]', () => {
    it('returns 403 if user is not the owner', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockAuthorProfilesDb = [
        { id: 'ap1', user_id: 'u2', name: 'Author 1' },
      ];

      const req = new NextRequest('http://localhost/api/author-profiles/ap1', {
        method: 'DELETE',
      });
      const res = await deleteProfile(req, { params: Promise.resolve({ id: 'ap1' }) });
      expect(res.status).toBe(403);
    });

    it('deletes the profile successfully', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockAuthorProfilesDb = [
        { id: 'ap1', user_id: 'u1', name: 'Author 1' },
      ];

      const req = new NextRequest('http://localhost/api/author-profiles/ap1', {
        method: 'DELETE',
      });
      const res = await deleteProfile(req, { params: Promise.resolve({ id: 'ap1' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.deleted).toBe(true);
      expect(mockAuthorProfilesDb).toHaveLength(0);
    });

    it('returns 404 if database error occurs during fetch', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockError = true;
      const req = new NextRequest('http://localhost/api/author-profiles/ap1', {
        method: 'DELETE',
      });
      const res = await deleteProfile(req, { params: Promise.resolve({ id: 'ap1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 500 on unexpected exception during delete', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      vi.spyOn(mockSupabaseClient, 'from').mockImplementationOnce(() => {
        throw new Error('Unexpected crash');
      });
      const req = new NextRequest('http://localhost/api/author-profiles/ap1', {
        method: 'DELETE',
      });
      const res = await deleteProfile(req, { params: Promise.resolve({ id: 'ap1' }) });
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/author-profiles/[id]/train', () => {
    it('returns 400 if url is missing', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockAuthorProfilesDb = [
        { id: 'ap1', user_id: 'u1', name: 'Author 1', source_url: null },
      ];

      const req = new NextRequest('http://localhost/api/author-profiles/ap1/train', { method: 'POST' });
      const res = await trainProfile(req, { params: Promise.resolve({ id: 'ap1' }) });
      expect(res.status).toBe(400);
    });

    it('runs training successfully with direct article link', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockAuthorProfilesDb = [
        { id: 'ap1', user_id: 'u1', name: 'Author 1', source_url: 'https://gocnhinmoi.com.vn/some-post-82144' },
      ];

      mockCrawlUrl.mockResolvedValue({
        url: 'https://gocnhinmoi.com.vn/some-post-82144',
        title: 'Mock Title',
        contentHtml: 'Body text',
        fullPageHtml: 'href="/space-x-82145"',
        crawledAt: new Date().toISOString(),
      });

      mockPreprocessArticle.mockReturnValue({
        full_text: 'Body text description content',
        description: 'Desc',
        tags: [],
        images: [],
        body: [],
      });

      const req = new NextRequest('http://localhost/api/author-profiles/ap1/train', { method: 'POST' });
      const res = await trainProfile(req, { params: Promise.resolve({ id: 'ap1' }) });
      
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ready');
      expect(json.tuned_model_id).toBeNull();

      const updated = mockAuthorProfilesDb.find(a => a.id === 'ap1');
      expect(updated.tuning_status).toBe('ready');
      expect(updated.sample_posts).toHaveLength(1);
    });

    it('runs training successfully with page links scrape', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockAuthorProfilesDb = [
        { id: 'ap1', user_id: 'u1', name: 'Author 1', source_url: 'https://gocnhinmoi.com.vn/' },
      ];

      mockCrawlUrl.mockResolvedValue({
        url: 'https://gocnhinmoi.com.vn/',
        title: 'Home',
        contentHtml: 'Links',
        fullPageHtml: 'href="/space-x-82145" href="/another-post-82146"',
        crawledAt: new Date().toISOString(),
      });

      mockPreprocessArticle.mockReturnValue({
        full_text: 'Mock Page content text',
        description: 'Page Desc',
        tags: [],
        images: [],
        body: [],
      });

      const req = new NextRequest('http://localhost/api/author-profiles/ap1/train', { method: 'POST' });
      const res = await trainProfile(req, { params: Promise.resolve({ id: 'ap1' }) });
      
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ready');
    });

    it('returns 500 if crawl fails and throws error', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockAuthorProfilesDb = [
        { id: 'ap1', user_id: 'u1', name: 'Author 1', source_url: 'https://gocnhinmoi.com.vn/' },
      ];

      mockCrawlUrl.mockRejectedValue(new Error('Scraping error'));

      const req = new NextRequest('http://localhost/api/author-profiles/ap1/train', { method: 'POST' });
      const res = await trainProfile(req, { params: Promise.resolve({ id: 'ap1' }) });
      expect(res.status).toBe(500);

      const updated = mockAuthorProfilesDb.find(a => a.id === 'ap1');
      expect(updated.tuning_status).toBe('failed');
    });

    it('returns 500 on unexpected exception during train', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      vi.spyOn(mockSupabaseClient, 'from').mockImplementationOnce(() => {
        throw new Error('Unexpected crash');
      });
      const req = new NextRequest('http://localhost/api/author-profiles/ap1/train', { method: 'POST' });
      const res = await trainProfile(req, { params: Promise.resolve({ id: 'ap1' }) });
      expect(res.status).toBe(500);
    });
  });
});
