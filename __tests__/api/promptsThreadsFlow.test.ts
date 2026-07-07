import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createPrompt } from '@/app/api/prompts/route';
import { PUT as updatePrompt, DELETE as deletePrompt } from '@/app/api/prompts/[id]/route';

let currentRole = 'marketer_full';
let mockPromptsDb: any[] = [];
let mockGetUser = vi.fn();

class MockQueryBuilder {
  constructor(private table: string) { }

  select(columns?: string, options?: any) {
    return this;
  }

  eq(column: string, value: any) {
    if (column === 'id') this.idFilter = value;
    if (column === 'created_by') this.userIdFilter = value;
    if (column === 'platform') this.platformFilter = value;
    if (column === 'is_deleted') this.isDeletedFilter = value;
    return this;
  }

  insert(data: any) {
    if (this.table === 'prompts') {
      const newPrompt = { id: `p_${mockPromptsDb.length + 1}`, ...data };
      mockPromptsDb.push(newPrompt);
    }
    return this;
  }

  update(data: any) {
    this.updateData = data;
    return this;
  }

  private applyUpdates() {
    if (this.table === 'prompts' && this.updateData) {
      if (this.idFilter) {
        mockPromptsDb = mockPromptsDb.map(p => p.id === this.idFilter ? { ...p, ...this.updateData } : p);
      } else {
        mockPromptsDb = mockPromptsDb.map(p => {
          const matchUser = this.userIdFilter === null || p.created_by === this.userIdFilter;
          const matchPlat = this.platformFilter === null || p.platform === this.platformFilter;
          const matchDel = this.isDeletedFilter === null || p.is_deleted === this.isDeletedFilter;
          if (matchUser && matchPlat && matchDel) {
            return { ...p, ...this.updateData };
          }
          return p;
        });
      }
      this.updateData = null;
    }
  }

  then(onfulfilled: any) {
    this.applyUpdates();
    let result: any = { data: null, error: null };
    if (this.table === 'users') {
      result = { data: { role: currentRole }, error: null };
    } else if (this.table === 'prompts') {
      result = { data: mockPromptsDb, error: null, count: mockPromptsDb.length };
    }
    return Promise.resolve(result).then(onfulfilled);
  }

  async single() {
    this.applyUpdates();
    if (this.table === 'users') {
      return { data: { role: currentRole }, error: null };
    }
    if (this.table === 'prompts') {
      const match = mockPromptsDb.find(p => p.id === this.idFilter) || mockPromptsDb[mockPromptsDb.length - 1] || null;
      return { data: match, error: match ? null : new Error('Not found') };
    }
    return { data: null, error: null };
  }

  async maybeSingle() {
    this.applyUpdates();
    if (this.table === 'prompts') {
      const match = mockPromptsDb.find(p => p.id === this.idFilter) || mockPromptsDb[0] || null;
      return { data: match, error: null };
    }
    return { data: null, error: null };
  }

  private userIdFilter: any = null;
  private platformFilter: any = null;
  private isDeletedFilter: any = null;
  private idFilter: any = null;
  private updateData: any = null;
}

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
    setAll: () => { },
  }),
}));

describe('Prompts Threads Flow integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentRole = 'marketer_full';
    mockPromptsDb = [];
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  });

  it('should support CRUD on Threads prompt templates', async () => {
    // 1. Create a prompt for Threads
    const reqCreate = new NextRequest('http://localhost/api/prompts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Threads test prompt',
        platform: 'threads',
        content: 'Generate short youth post',
        tags: ['threads', 'youth']
      }),
    });
    const resCreate = await createPrompt(reqCreate);
    expect(resCreate.status).toBe(201);
    expect(mockPromptsDb).toHaveLength(1);
    expect(mockPromptsDb[0].platform).toBe('thread'); // transforms Threads -> thread

    // 2. Update the prompt
    const reqUpdate = new NextRequest('http://localhost/api/prompts/p_1', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Threads test prompt (Updated)',
        content: 'New content instruction',
      }),
    });
    const resUpdate = await updatePrompt(reqUpdate, { params: Promise.resolve({ id: 'p_1' }) });
    expect(resUpdate.status).toBe(200);
    expect(mockPromptsDb[0].name).toBe('Threads test prompt (Updated)');

    // 3. Delete the prompt (Soft delete)
    const resDelete = await deletePrompt(new NextRequest('http://localhost/api/prompts/p_1'), { params: Promise.resolve({ id: 'p_1' }) });
    expect(resDelete.status).toBe(200);
    expect(mockPromptsDb[0].is_deleted).toBe(true);
  });

  it('should reset other defaults when is_default=true is set on create', async () => {
    mockPromptsDb = [
      { id: 'p_1', created_by: 'u1', platform: 'thread', is_default: true, is_deleted: false, name: 'Default 1' }
    ];

    const reqCreate = new NextRequest('http://localhost/api/prompts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Default 2',
        platform: 'threads',
        content: 'New default',
        is_default: true
      }),
    });
    const resCreate = await createPrompt(reqCreate);
    expect(resCreate.status).toBe(201);
    
    // First prompt should be set to is_default = false
    const firstPrompt = mockPromptsDb.find(p => p.id === 'p_1');
    expect(firstPrompt.is_default).toBe(false);
    // New prompt should be is_default = true
    const secondPrompt = mockPromptsDb.find(p => p.name === 'Default 2');
    expect(secondPrompt.is_default).toBe(true);
  });
});
