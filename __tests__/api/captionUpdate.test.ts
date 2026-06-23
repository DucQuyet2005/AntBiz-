import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const hoisted = vi.hoisted(() => {
  let currentRole = 'marketer_full';
  let mockError = false;
  let mockUpdateError = false;
  let mockVersionReadError = false;
  let mockCaptionsDb: any[] = [];
  let mockCaptionVersionsDb: any[] = [];
  const mockGetUser = vi.fn();

  class MockQueryBuilder {
    private filters: Record<string, any> = {};
    private updatePayload: any = null;
    private insertPayload: any = null;

    constructor(private table: string) {}

    select() {
      return this;
    }

    eq(column: string, value: any) {
      this.filters[column] = value;
      return this;
    }

    order() {
      return this;
    }

    limit() {
      return this;
    }

    maybeSingle() {
      if (mockError) {
        return Promise.resolve({ data: null, error: new Error('Database error') });
      }
      if (this.table === 'captions') {
        return Promise.resolve({
          data: mockCaptionsDb.find((caption) => caption.id === this.filters.id) ?? null,
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    }

    single() {
      if (mockError) {
        return Promise.resolve({ data: null, error: new Error('Database error') });
      }
      if (this.table === 'users') {
        return Promise.resolve({ data: { role: currentRole }, error: null });
      }
      if (this.table === 'captions') {
        if (mockUpdateError && this.updatePayload) {
          return Promise.resolve({ data: null, error: new Error('Update error') });
        }
        if (this.updatePayload) {
          mockCaptionsDb = mockCaptionsDb.map((caption) =>
            caption.id === this.filters.id ? { ...caption, ...this.updatePayload } : caption
          );
        }
        return Promise.resolve({
          data: mockCaptionsDb.find((caption) => caption.id === this.filters.id) ?? null,
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    }

    update(data: any) {
      this.updatePayload = data;
      return this;
    }

    insert(data: any) {
      this.insertPayload = data;
      if (!mockError && this.table === 'caption_versions') {
        mockCaptionVersionsDb.push({ id: `v${mockCaptionVersionsDb.length + 1}`, ...data });
      }
      return this;
    }

    then(onfulfilled: any) {
      let result: any = { data: null, error: null };
      if (mockError) {
        result = { data: null, error: new Error('Database error') };
      } else if (mockVersionReadError && this.table === 'caption_versions' && !this.insertPayload) {
        result = { data: null, error: new Error('Version read error') };
      } else if (this.table === 'caption_versions') {
        result = this.insertPayload
          ? { data: [this.insertPayload], error: null }
          : { data: mockCaptionVersionsDb, error: null };
      } else if (this.table === 'captions') {
        result = { data: mockCaptionsDb, error: null };
      }
      return Promise.resolve(result).then(onfulfilled);
    }
  }

  const mockSupabaseClient = {
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => new MockQueryBuilder(table),
  };

  return {
    mockSupabaseClient,
    mockGetUser,
    getState: () => ({
      get currentRole() { return currentRole; },
      set currentRole(value) { currentRole = value; },
      get mockError() { return mockError; },
      set mockError(value) { mockError = value; },
      get mockUpdateError() { return mockUpdateError; },
      set mockUpdateError(value) { mockUpdateError = value; },
      get mockVersionReadError() { return mockVersionReadError; },
      set mockVersionReadError(value) { mockVersionReadError = value; },
      get mockCaptionsDb() { return mockCaptionsDb; },
      set mockCaptionsDb(value) { mockCaptionsDb = value; },
      get mockCaptionVersionsDb() { return mockCaptionVersionsDb; },
      set mockCaptionVersionsDb(value) { mockCaptionVersionsDb = value; },
    }),
  };
});

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => hoisted.mockSupabaseClient,
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [],
    setAll: () => {},
  }),
}));

import { GET, PUT } from '@/app/api/captions/[id]/route';

const params = { params: Promise.resolve({ id: 'c1' }) };

describe('PUT /api/captions/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const state = hoisted.getState();
    state.currentRole = 'marketer_full';
    state.mockError = false;
    state.mockUpdateError = false;
    state.mockVersionReadError = false;
    state.mockCaptionsDb = [{
      id: 'c1',
      created_by: 'u1',
      ai_content: 'AI original',
      edited_content: null,
      status: 'draft',
    }];
    state.mockCaptionVersionsDb = [{ id: 'v1', caption_id: 'c1', version_number: 1, content: 'AI original', source: 'ai' }];
    hoisted.mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  });

  it('updates edited_content, keeps ai_content unchanged, and returns 200', async () => {
    const req = new NextRequest('http://localhost/api/captions/c1', {
      method: 'PUT',
      body: JSON.stringify({ edited_content: 'Edited caption' }),
    });

    const res = await PUT(req, params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.edited_content).toBe('Edited caption');
    expect(json.data.ai_content).toBe('AI original');
    expect(json.data.status).toBe('edited');
  });

  it('GET returns a caption by id', async () => {
    const req = new NextRequest('http://localhost/api/captions/c1');

    const res = await GET(req, params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.id).toBe('c1');
    expect(json.data.ai_content).toBe('AI original');
  });

  it('GET returns 401 when unauthenticated', async () => {
    hoisted.mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') });
    const req = new NextRequest('http://localhost/api/captions/c1');

    const res = await GET(req, params);

    expect(res.status).toBe(401);
  });

  it('writes a human caption version when edited content changes', async () => {
    const req = new NextRequest('http://localhost/api/captions/c1', {
      method: 'PUT',
      body: JSON.stringify({ edited_content: 'Second version' }),
    });

    await PUT(req, params);

    const versions = hoisted.getState().mockCaptionVersionsDb;
    expect(versions).toHaveLength(2);
    expect(versions[1]).toMatchObject({
      caption_id: 'c1',
      version_number: 2,
      content: 'Second version',
      source: 'human',
    });
  });

  it('returns 400 for invalid edited content', async () => {
    const req = new NextRequest('http://localhost/api/captions/c1', {
      method: 'PUT',
      body: JSON.stringify({ edited_content: '' }),
    });

    const res = await PUT(req, params);

    expect(res.status).toBe(400);
  });

  it('returns 400 for malformed JSON', async () => {
    const req = new NextRequest('http://localhost/api/captions/c1', {
      method: 'PUT',
      body: '{invalid',
    });

    const res = await PUT(req, params);

    expect(res.status).toBe(400);
  });

  it('allows admin to edit another user caption', async () => {
    const state = hoisted.getState();
    state.currentRole = 'admin';
    state.mockCaptionsDb = [{
      id: 'c1',
      created_by: 'u2',
      ai_content: 'AI original',
      edited_content: null,
      status: 'draft',
    }];

    const req = new NextRequest('http://localhost/api/captions/c1', {
      method: 'PUT',
      body: JSON.stringify({ edited_content: 'Admin edit' }),
    });

    const res = await PUT(req, params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.edited_content).toBe('Admin edit');
  });

  it('updates status without creating a human version when content is unchanged', async () => {
    const req = new NextRequest('http://localhost/api/captions/c1', {
      method: 'PUT',
      body: JSON.stringify({ status: 'approved' }),
    });

    const res = await PUT(req, params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe('approved');
    expect(hoisted.getState().mockCaptionVersionsDb).toHaveLength(1);
  });

  it('returns 500 when update fails', async () => {
    hoisted.getState().mockUpdateError = true;
    const req = new NextRequest('http://localhost/api/captions/c1', {
      method: 'PUT',
      body: JSON.stringify({ edited_content: 'Edited caption' }),
    });

    const res = await PUT(req, params);

    expect(res.status).toBe(500);
  });

  it('still returns 200 if version history read fails after caption update', async () => {
    hoisted.getState().mockVersionReadError = true;
    const req = new NextRequest('http://localhost/api/captions/c1', {
      method: 'PUT',
      body: JSON.stringify({ edited_content: 'Edited despite version error' }),
    });

    const res = await PUT(req, params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.edited_content).toBe('Edited despite version error');
  });

  it('returns 403 when a non-owner marketer edits another user caption', async () => {
    hoisted.getState().mockCaptionsDb = [{
      id: 'c1',
      created_by: 'u2',
      ai_content: 'AI original',
      edited_content: null,
      status: 'draft',
    }];

    const req = new NextRequest('http://localhost/api/captions/c1', {
      method: 'PUT',
      body: JSON.stringify({ edited_content: 'Edited caption' }),
    });

    const res = await PUT(req, params);

    expect(res.status).toBe(403);
  });

  it('returns 404 when caption does not exist', async () => {
    hoisted.getState().mockCaptionsDb = [];
    const req = new NextRequest('http://localhost/api/captions/c1', {
      method: 'PUT',
      body: JSON.stringify({ edited_content: 'Edited caption' }),
    });

    const res = await PUT(req, params);

    expect(res.status).toBe(404);
  });

  it('saves both AI original as version 1 and edited human as version 2 when no version history exists', async () => {
    hoisted.getState().mockCaptionVersionsDb = []; // empty version history
    const req = new NextRequest('http://localhost/api/captions/c1', {
      method: 'PUT',
      body: JSON.stringify({ edited_content: 'New human edit' }),
    });

    const res = await PUT(req, params);
    expect(res.status).toBe(200);

    const versions = hoisted.getState().mockCaptionVersionsDb;
    expect(versions).toHaveLength(2);
    expect(versions[0]).toMatchObject({
      caption_id: 'c1',
      version_number: 1,
      content: 'AI original',
      source: 'ai',
    });
    expect(versions[1]).toMatchObject({
      caption_id: 'c1',
      version_number: 2,
      content: 'New human edit',
      source: 'human',
    });
  });
});
