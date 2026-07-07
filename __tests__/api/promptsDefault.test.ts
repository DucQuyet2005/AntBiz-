import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getDefaultPrompt } from '@/app/api/prompts/default/route';

let currentRole = 'marketer_full';
let mockPromptsDb: any[] = [];
let mockGetUser = vi.fn();

// Mock query builder for Supabase
class MockQueryBuilder {
  constructor(private table: string) {}

  select() { return this; }
  eq(field: string, value: any) { 
    if (field === 'is_default') {
      this.isDefaultFilter = value;
    }
    if (field === 'platform') {
      this.platformFilter = value;
    }
    return this; 
  }
  order() { return this; }
  limit() { return this; }
  
  private isDefaultFilter: any = null;
  private platformFilter: any = null;

  single() {
    if (this.table === 'users') {
      return Promise.resolve({ data: { role: currentRole }, error: null });
    }
    return Promise.resolve({ data: mockPromptsDb[0] || null, error: null });
  }

  maybeSingle() {
    if (this.table === 'users') {
      return Promise.resolve({ data: { role: currentRole }, error: null });
    }
    if (this.table === 'prompts') {
      // Tìm prompt khớp với platform và is_default filter
      let data = null;
      if (this.isDefaultFilter === true) {
        data = mockPromptsDb.find(p => p.platform === this.platformFilter && p.is_default === true) || null;
      } else {
        data = mockPromptsDb.find(p => p.platform === this.platformFilter) || null;
      }
      return Promise.resolve({ data, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  }
}

const mockSupabaseClient = {
  auth: { getUser: mockGetUser },
  from: (table: string) => new MockQueryBuilder(table),
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => mockSupabaseClient,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseClient,
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [],
    setAll: () => {},
  }),
}));

describe('Prompts Default API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentRole = 'marketer_full';
    mockPromptsDb = [];
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  });

  it('should return 400 if platform parameter is missing', async () => {
    const req = new NextRequest('http://localhost/api/prompts/default', {
      method: 'GET',
    });
    const res = await getDefaultPrompt(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Thiếu platform');
  });

  it('should return default prompt if exists', async () => {
    mockPromptsDb = [
      { id: 'p1', name: 'Default Thread Prompt', platform: 'thread', is_default: true, content: 'Threads default instruction' },
      { id: 'p2', name: 'Other Prompt', platform: 'thread', is_default: false, content: 'Some other' }
    ];

    const req = new NextRequest('http://localhost/api/prompts/default?platform=threads', {
      method: 'GET',
    });
    const res = await getDefaultPrompt(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe('p1');
    expect(body.data.is_default).toBe(true);
  });

  it('should fallback to first prompt of platform if no default prompt exists', async () => {
    mockPromptsDb = [
      { id: 'p2', name: 'Other Prompt', platform: 'thread', is_default: false, content: 'Some other' }
    ];

    const req = new NextRequest('http://localhost/api/prompts/default?platform=threads', {
      method: 'GET',
    });
    const res = await getDefaultPrompt(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe('p2');
    expect(body.data.is_default).toBe(false);
  });

  it('should return null if no prompts exist for the platform', async () => {
    const req = new NextRequest('http://localhost/api/prompts/default?platform=threads', {
      method: 'GET',
    });
    const res = await getDefaultPrompt(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeNull();
  });
});
