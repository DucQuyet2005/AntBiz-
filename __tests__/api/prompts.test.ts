import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getPrompts, POST as createPrompt } from '@/app/api/prompts/route';
import { GET as getPrompt, PUT as updatePrompt, DELETE as deletePrompt } from '@/app/api/prompts/[id]/route';
import { POST as clonePrompt } from '@/app/api/prompts/[id]/clone/route';
import { GET as checkUsage } from '@/app/api/prompts/[id]/check-usage/route';

let currentRole = 'marketer_full';
let mockError = false;
let mockPromptsDb: any[] = [];
let mockCaptionsDb: any[] = [];
let mockScheduledPostsDb: any[] = [];

class MockQueryBuilder {
  constructor(private table: string) {}

  select(columns?: string, options?: any) {
    return this;
  }

  eq(column: string, value: any) {
    return this;
  }

  contains(column: string, value: any) {
    return this;
  }

  ilike(column: string, value: any) {
    return this;
  }

  order(column: string, options?: any) {
    return this;
  }

  range(from: number, to: number) {
    return this;
  }

  insert(data: any) {
    if (this.table === 'prompts') {
      mockPromptsDb = [{ id: 'p1', ...data }];
    }
    return this;
  }

  update(data: any) {
    if (this.table === 'prompts') {
      mockPromptsDb = [{ ...mockPromptsDb[0], ...data }];
    }
    return this;
  }

  in(column: string, values: any[]) {
    return this;
  }

  then(onfulfilled: any) {
    let result: any = { data: null, error: null };

    if (mockError && this.table !== 'users') {
      result = { data: null, error: new Error('Database error'), count: 0 };
    } else if (this.table === 'users') {
      result = { data: { role: currentRole }, error: null };
    } else if (this.table === 'prompts') {
      result = { data: mockPromptsDb, error: null, count: mockPromptsDb.length };
    } else if (this.table === 'captions') {
      result = { data: mockCaptionsDb, error: null };
    } else if (this.table === 'scheduled_posts') {
      result = { data: mockScheduledPostsDb, error: null };
    }

    return Promise.resolve(result).then(onfulfilled);
  }

  async single() {
    if (mockError && this.table !== 'users') {
      return { data: null, error: new Error('Database error') };
    }
    if (this.table === 'users') {
      return { data: { role: currentRole }, error: null };
    }
    if (this.table === 'prompts') {
      return { data: mockPromptsDb[0] || null, error: mockPromptsDb[0] ? null : new Error('Not found') };
    }
    return { data: null, error: null };
  }

  async maybeSingle() {
    if (mockError && this.table !== 'users') {
      return { data: null, error: new Error('Database error') };
    }
    if (this.table === 'prompts') {
      return { data: mockPromptsDb[0] || null, error: null };
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

describe('Prompts API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentRole = 'marketer_full';
    mockError = false;
    mockPromptsDb = [];
    mockCaptionsDb = [];
    mockScheduledPostsDb = [];
  });

  describe('GET /api/prompts (List Prompts)', () => {
    it('returns 401 if not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') });
      const req = new NextRequest('http://localhost/api/prompts');
      const res = await getPrompts(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 if role is not allowed', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'viewer';
      const req = new NextRequest('http://localhost/api/prompts');
      const res = await getPrompts(req);
      expect(res.status).toBe(403);
    });

    it('returns 200 with prompts list for valid role', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'marketer_full';
      mockPromptsDb = [{ id: 'p1', name: 'Prompt 1', platform: 'facebook', tags: [], created_by: 'u1' }];

      const req = new NextRequest('http://localhost/api/prompts?page=1&pageSize=10');
      const res = await getPrompts(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.pagination.total).toBe(1);
    });

    it('returns 500 if database error occurs', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'marketer_full';
      mockError = true;

      const req = new NextRequest('http://localhost/api/prompts');
      const res = await getPrompts(req);
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/prompts (Create Prompt)', () => {
    it('returns 400 if invalid request body', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'admin';

      const req = new NextRequest('http://localhost/api/prompts', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
      });
      const res = await createPrompt(req);
      expect(res.status).toBe(400);
    });

    it('returns 201 with created prompt on success', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'admin';
      mockPromptsDb = [{ id: 'p1', name: 'New prompt', platform: 'facebook', content: 'test', tags: [] }];

      const req = new NextRequest('http://localhost/api/prompts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New prompt',
          platform: 'facebook',
          content: 'Write a facebook post',
          tags: ['sales'],
        }),
      });
      const res = await createPrompt(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe('p1');
    });

    it('returns 500 on database error during create', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'admin';
      mockError = true;

      const req = new NextRequest('http://localhost/api/prompts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New prompt',
          platform: 'facebook',
          content: 'Write a facebook post',
          tags: ['sales'],
        }),
      });
      const res = await createPrompt(req);
      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/prompts/[id] (View Prompt)', () => {
    it('returns 404 if prompt not found', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'marketer_content';
      mockPromptsDb = [];

      const res = await getPrompt(new NextRequest('http://localhost/api/prompts/p1'), {
        params: Promise.resolve({ id: 'p1' }),
      });
      expect(res.status).toBe(404);
    });

    it('returns 200 with prompt data if found', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'marketer_content';
      mockPromptsDb = [{ id: 'p1', name: 'Test Prompt', created_by: 'u1' }];

      const res = await getPrompt(new NextRequest('http://localhost/api/prompts/p1'), {
        params: Promise.resolve({ id: 'p1' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.name).toBe('Test Prompt');
    });

    it('returns 500 on database error', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'marketer_content';
      mockError = true;

      const res = await getPrompt(new NextRequest('http://localhost/api/prompts/p1'), {
        params: Promise.resolve({ id: 'p1' }),
      });
      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/prompts/[id] (Update Prompt)', () => {
    it('returns 403 if RLS fails (user not owner or admin)', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'marketer_content';
      mockPromptsDb = [{ id: 'p1' }];
      
      const originalMaybeSingle = MockQueryBuilder.prototype.maybeSingle;
      MockQueryBuilder.prototype.maybeSingle = async function() {
        if (mockPromptsDb.length === 1 && mockPromptsDb[0].id === 'p1') {
          mockPromptsDb = [];
          return { data: { id: 'p1' }, error: null };
        }
        return { data: null, error: null };
      };

      const req = new NextRequest('http://localhost/api/prompts/p1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated name' }),
      });
      const res = await updatePrompt(req, {
        params: Promise.resolve({ id: 'p1' }),
      });
      expect(res.status).toBe(403);
      
      MockQueryBuilder.prototype.maybeSingle = originalMaybeSingle;
    });

    it('returns 200 with updated data on success', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'admin';
      mockPromptsDb = [{ id: 'p1', name: 'Updated name' }];

      const req = new NextRequest('http://localhost/api/prompts/p1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated name' }),
      });
      const res = await updatePrompt(req, {
        params: Promise.resolve({ id: 'p1' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.name).toBe('Updated name');
    });

    it('returns 500 on database error during update fetch or perform', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'admin';
      mockError = true;

      const req = new NextRequest('http://localhost/api/prompts/p1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated name' }),
      });
      const res = await updatePrompt(req, {
        params: Promise.resolve({ id: 'p1' }),
      });
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /api/prompts/[id] (Soft Delete)', () => {
    it('returns 403 if user not owner/admin', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'marketer_content';
      mockPromptsDb = [{ id: 'p1' }];

      const originalMaybeSingle = MockQueryBuilder.prototype.maybeSingle;
      MockQueryBuilder.prototype.maybeSingle = async function() {
        if (mockPromptsDb.length === 1 && mockPromptsDb[0].id === 'p1') {
          mockPromptsDb = [];
          return { data: { id: 'p1' }, error: null };
        }
        return { data: null, error: null };
      };

      const res = await deletePrompt(new NextRequest('http://localhost/api/prompts/p1'), {
        params: Promise.resolve({ id: 'p1' }),
      });
      expect(res.status).toBe(403);

      MockQueryBuilder.prototype.maybeSingle = originalMaybeSingle;
    });

    it('returns 200 with deleted true on success', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'admin';
      mockPromptsDb = [{ id: 'p1' }];

      const res = await deletePrompt(new NextRequest('http://localhost/api/prompts/p1'), {
        params: Promise.resolve({ id: 'p1' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.deleted).toBe(true);
    });

    it('returns 500 on database error during delete', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'admin';
      mockError = true;

      const res = await deletePrompt(new NextRequest('http://localhost/api/prompts/p1'), {
        params: Promise.resolve({ id: 'p1' }),
      });
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/prompts/[id]/clone (Clone Prompt)', () => {
    it('clones prompt with Copy of name prefix', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'marketer_full';
      mockPromptsDb = [{ id: 'p1', name: 'Original Name', platform: 'facebook', content: 'test', tags: [], created_by: 'u1' }];

      const res = await clonePrompt(new NextRequest('http://localhost/api/prompts/p1/clone'), {
        params: Promise.resolve({ id: 'p1' }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.name).toBe('Copy of Original Name');
    });

    it('returns 500 on database error during clone', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'marketer_full';
      mockError = true;

      const res = await clonePrompt(new NextRequest('http://localhost/api/prompts/p1/clone'), {
        params: Promise.resolve({ id: 'p1' }),
      });
      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/prompts/[id]/check-usage (Check Usage)', () => {
    it('returns in_use status', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'marketer_full';
      mockPromptsDb = [{ id: 'p1', created_by: 'u1' }];
      mockCaptionsDb = [{ id: 'c1' }];
      mockScheduledPostsDb = [{ caption_id: 'c1' }];

      const res = await checkUsage(new NextRequest('http://localhost/api/prompts/p1/check-usage'), {
        params: Promise.resolve({ id: 'p1' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.in_use).toBe(true);
      expect(json.count).toBe(1);
    });

    it('returns 500 on database error during check-usage', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      currentRole = 'marketer_full';
      mockError = true;

      const res = await checkUsage(new NextRequest('http://localhost/api/prompts/p1/check-usage'), {
        params: Promise.resolve({ id: 'p1' }),
      });
      expect(res.status).toBe(500);
    });
  });
});
