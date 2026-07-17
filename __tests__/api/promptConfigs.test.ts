import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getConfigs, POST as createConfig } from '@/app/api/prompt-configs/route';
import { PUT as updateConfig, DELETE as deleteConfig } from '@/app/api/prompt-configs/[id]/route';
import { GET as getDefaultConfig } from '@/app/api/prompt-configs/default/route';

let currentRole = 'marketer_full';
let mockError = false;
let mockPromptConfigsDb: any[] = [];

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

    if (this.table !== 'prompt_configs') {
      return [];
    }

    if (this.action === 'insert') {
      const records = Array.isArray(this.actionData) ? this.actionData : [this.actionData];
      const inserted = records.map((r, i) => ({
        id: r.id || `pc-${mockPromptConfigsDb.length + i + 1}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_default: false,
        params: {},
        ...r,
      }));
      mockPromptConfigsDb.push(...inserted);
      this.filters = [{ col: 'id', val: inserted[0].id, type: 'eq' }];
      this.action = 'select';
    }

    const getFiltered = () => {
      return mockPromptConfigsDb.filter((r) => {
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
        const idx = mockPromptConfigsDb.findIndex((dbR) => dbR.id === r.id);
        if (idx !== -1) {
          mockPromptConfigsDb[idx] = {
            ...mockPromptConfigsDb[idx],
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
        mockPromptConfigsDb = mockPromptConfigsDb.filter((dbR) => dbR.id !== r.id);
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

describe('Prompt Configs API Endpoints (US-2.07)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    currentRole = 'marketer_full';
    mockError = false;
    mockPromptConfigsDb = [];
  });

  describe('GET /api/prompt-configs (List Configs)', () => {
    it('returns 401 if unauthorized', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') });
      const req = new NextRequest('http://localhost/api/prompt-configs');
      const res = await getConfigs(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 with configs of current user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockPromptConfigsDb = [
        { id: 'pc1', user_id: 'u1', name: 'Config 1', platform: 'facebook', params: {} },
        { id: 'pc2', user_id: 'u2', name: 'Config 2', platform: 'facebook', params: {} },
      ];

      const req = new NextRequest('http://localhost/api/prompt-configs');
      const res = await getConfigs(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      const userConfigs = json.data.filter((item: any) => !item.is_system);
      expect(userConfigs).toHaveLength(1);
      expect(userConfigs[0].id).toBe('pc1');
    });

    it('filters configs by platform', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockPromptConfigsDb = [
        { id: 'pc1', user_id: 'u1', name: 'FB Config', platform: 'facebook', params: {} },
        { id: 'pc2', user_id: 'u1', name: 'IG Config', platform: 'instagram', params: {} },
      ];

      const req = new NextRequest('http://localhost/api/prompt-configs?platform=instagram');
      const res = await getConfigs(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      const userConfigs = json.data.filter((item: any) => !item.is_system);
      expect(userConfigs).toHaveLength(1);
      expect(userConfigs[0].name).toBe('IG Config');
    });

    it('returns 500 if database error occurs', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockError = true;
      const req = new NextRequest('http://localhost/api/prompt-configs');
      const res = await getConfigs(req);
      expect(res.status).toBe(500);
    });

    it('returns 500 on unexpected exception', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      vi.spyOn(mockSupabaseClient, 'from').mockImplementationOnce(() => {
        throw new Error('Unexpected crash');
      });
      const req = new NextRequest('http://localhost/api/prompt-configs');
      const res = await getConfigs(req);
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/prompt-configs (Create Config)', () => {
    it('returns 400 if name is empty', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const req = new NextRequest('http://localhost/api/prompt-configs', {
        method: 'POST',
        body: JSON.stringify({ name: '', platform: 'facebook' }),
      });
      const res = await createConfig(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 if body is invalid JSON', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const req = new NextRequest('http://localhost/api/prompt-configs', {
        method: 'POST',
        body: 'invalid-json',
      });
      const res = await createConfig(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 if config name already exists for same user and platform', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockPromptConfigsDb = [
        { id: 'pc1', user_id: 'u1', name: 'Dup Config', platform: 'facebook' },
      ];

      const req = new NextRequest('http://localhost/api/prompt-configs', {
        method: 'POST',
        body: JSON.stringify({ name: 'Dup Config', platform: 'facebook' }),
      });
      const res = await createConfig(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('đã tồn tại');
    });

    it('resets other default configs if is_default=true', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockPromptConfigsDb = [
        { id: 'pc1', user_id: 'u1', name: 'Old Default', platform: 'facebook', is_default: true },
      ];

      const req = new NextRequest('http://localhost/api/prompt-configs', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Default', platform: 'facebook', is_default: true }),
      });
      const res = await createConfig(req);
      expect(res.status).toBe(201);

      const oldDefault = mockPromptConfigsDb.find(c => c.id === 'pc1');
      expect(oldDefault.is_default).toBe(false);

      const newConfig = mockPromptConfigsDb.find(c => c.name === 'New Default');
      expect(newConfig.is_default).toBe(true);
    });

    it('returns 500 if database error occurs', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockError = true;
      const req = new NextRequest('http://localhost/api/prompt-configs', {
        method: 'POST',
        body: JSON.stringify({ name: 'Error Config', platform: 'facebook' }),
      });
      const res = await createConfig(req);
      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/prompt-configs/default (Get Default Config)', () => {
    it('returns default config for specified platform', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockPromptConfigsDb = [
        { id: 'pc1', user_id: 'u1', name: 'Default FB', platform: 'facebook', is_default: true },
        { id: 'pc2', user_id: 'u1', name: 'Non-default FB', platform: 'facebook', is_default: false },
      ];

      const req = new NextRequest('http://localhost/api/prompt-configs/default?platform=facebook');
      const res = await getDefaultConfig(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe('pc1');
    });

    it('returns null if no default config exists', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockPromptConfigsDb = [];

      const req = new NextRequest('http://localhost/api/prompt-configs/default?platform=facebook');
      const res = await getDefaultConfig(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeNull();
    });

    it('returns 500 if database error occurs', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockError = true;
      const req = new NextRequest('http://localhost/api/prompt-configs/default?platform=facebook');
      const res = await getDefaultConfig(req);
      expect(res.status).toBe(500);
    });

    it('returns 500 on unexpected exception', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      vi.spyOn(mockSupabaseClient, 'from').mockImplementationOnce(() => {
        throw new Error('Unexpected crash');
      });
      const req = new NextRequest('http://localhost/api/prompt-configs/default?platform=facebook');
      const res = await getDefaultConfig(req);
      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/prompt-configs/[id] (Update Config)', () => {
    it('returns 403 if user is not the owner', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockPromptConfigsDb = [
        { id: 'pc1', user_id: 'u2', name: 'Config 1', platform: 'facebook', is_default: false },
      ];

      const req = new NextRequest('http://localhost/api/prompt-configs/pc1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'New name' }),
      });
      const res = await updateConfig(req, { params: Promise.resolve({ id: 'pc1' }) });
      expect(res.status).toBe(403);
    });

    it('returns 400 if body is invalid JSON', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const req = new NextRequest('http://localhost/api/prompt-configs/pc1', {
        method: 'PUT',
        body: 'invalid-json',
      });
      const res = await updateConfig(req, { params: Promise.resolve({ id: 'pc1' }) });
      expect(res.status).toBe(400);
    });

    it('returns 400 if name is empty', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const req = new NextRequest('http://localhost/api/prompt-configs/pc1', {
        method: 'PUT',
        body: JSON.stringify({ name: '' }),
      });
      const res = await updateConfig(req, { params: Promise.resolve({ id: 'pc1' }) });
      expect(res.status).toBe(400);
    });

    it('returns 400 if name already exists for another config', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockPromptConfigsDb = [
        { id: 'pc1', user_id: 'u1', name: 'Config 1', platform: 'facebook' },
        { id: 'pc2', user_id: 'u1', name: 'Dup Config', platform: 'facebook' },
      ];
      const req = new NextRequest('http://localhost/api/prompt-configs/pc1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Dup Config' }),
      });
      const res = await updateConfig(req, { params: Promise.resolve({ id: 'pc1' }) });
      expect(res.status).toBe(400);
    });

    it('updates prompt config and updates defaults if is_default=true', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockPromptConfigsDb = [
        { id: 'pc1', user_id: 'u1', name: 'Config 1', platform: 'facebook', is_default: false },
        { id: 'pc2', user_id: 'u1', name: 'Old Default', platform: 'facebook', is_default: true },
      ];

      const req = new NextRequest('http://localhost/api/prompt-configs/pc1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Config 1 Updated', is_default: true }),
      });
      const res = await updateConfig(req, { params: Promise.resolve({ id: 'pc1' }) });
      expect(res.status).toBe(200);

      const pc1 = mockPromptConfigsDb.find(c => c.id === 'pc1');
      expect(pc1.name).toBe('Config 1 Updated');
      expect(pc1.is_default).toBe(true);

      const pc2 = mockPromptConfigsDb.find(c => c.id === 'pc2');
      expect(pc2.is_default).toBe(false);
    });

    it('returns 404 if database error occurs during fetch', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockPromptConfigsDb = [
        { id: 'pc1', user_id: 'u1', name: 'Config 1', platform: 'facebook', is_default: false },
      ];
      mockError = true;
      const req = new NextRequest('http://localhost/api/prompt-configs/pc1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Error Update' }),
      });
      const res = await updateConfig(req, { params: Promise.resolve({ id: 'pc1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 500 on unexpected exception', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      vi.spyOn(mockSupabaseClient, 'from').mockImplementationOnce(() => {
        throw new Error('Unexpected crash');
      });
      const req = new NextRequest('http://localhost/api/prompt-configs/pc1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Error Update' }),
      });
      const res = await updateConfig(req, { params: Promise.resolve({ id: 'pc1' }) });
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /api/prompt-configs/[id] (Delete Config)', () => {
    it('returns 403 if user is not the owner', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockPromptConfigsDb = [
        { id: 'pc1', user_id: 'u2', name: 'Config 1', platform: 'facebook' },
      ];

      const req = new NextRequest('http://localhost/api/prompt-configs/pc1', {
        method: 'DELETE',
      });
      const res = await deleteConfig(req, { params: Promise.resolve({ id: 'pc1' }) });
      expect(res.status).toBe(403);
    });

    it('deletes the config successfully', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockPromptConfigsDb = [
        { id: 'pc1', user_id: 'u1', name: 'Config 1', platform: 'facebook' },
      ];

      const req = new NextRequest('http://localhost/api/prompt-configs/pc1', {
        method: 'DELETE',
      });
      const res = await deleteConfig(req, { params: Promise.resolve({ id: 'pc1' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.deleted).toBe(true);
      expect(mockPromptConfigsDb).toHaveLength(0);
    });

    it('returns 404 if database error occurs during fetch', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockPromptConfigsDb = [
        { id: 'pc1', user_id: 'u1', name: 'Config 1', platform: 'facebook' },
      ];
      mockError = true;
      const req = new NextRequest('http://localhost/api/prompt-configs/pc1', {
        method: 'DELETE',
      });
      const res = await deleteConfig(req, { params: Promise.resolve({ id: 'pc1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 500 on unexpected exception', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      vi.spyOn(mockSupabaseClient, 'from').mockImplementationOnce(() => {
        throw new Error('Unexpected crash');
      });
      const req = new NextRequest('http://localhost/api/prompt-configs/pc1', {
        method: 'DELETE',
      });
      const res = await deleteConfig(req, { params: Promise.resolve({ id: 'pc1' }) });
      expect(res.status).toBe(500);
    });
  });
});
