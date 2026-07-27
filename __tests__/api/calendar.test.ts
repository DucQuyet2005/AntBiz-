import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock client and state hoisted
const hoisted = vi.hoisted(() => {
  let currentRole = 'marketer_full';
  let mockError = false;
  let mockScheduledPostsDb: any[] = [];
  const mockGetUser = vi.fn();

  class MockQueryBuilder {
    private filters: { type: string; column: string; value: any }[] = [];
    constructor(private table: string) {}

    select(columns?: string) {
      return this;
    }

    gte(column: string, value: any) {
      this.filters.push({ type: 'gte', column, value });
      return this;
    }

    lte(column: string, value: any) {
      this.filters.push({ type: 'lte', column, value });
      return this;
    }

    in(column: string, value: any[]) {
      this.filters.push({ type: 'in', column, value });
      return this;
    }

    eq(column: string, value: any) {
      this.filters.push({ type: 'eq', column, value });
      return this;
    }

    order(column: string, options?: any) {
      return this;
    }

    private getFilteredPosts() {
      let filtered = [...mockScheduledPostsDb];
      for (const f of this.filters) {
        if (f.type === 'eq') {
          filtered = filtered.filter(item => item[f.column] === f.value);
        } else if (f.type === 'gte') {
          filtered = filtered.filter(item => new Date(item[f.column]) >= new Date(f.value));
        } else if (f.type === 'lte') {
          filtered = filtered.filter(item => new Date(item[f.column]) <= new Date(f.value));
        } else if (f.type === 'in') {
          filtered = filtered.filter(item => f.value.includes(item[f.column]));
        }
      }
      return filtered;
    }

    maybeSingle() {
      if (this.table === 'users') {
        return Promise.resolve({ data: { role: currentRole, email: 'user@test.com' }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }

    single() {
      if (this.table === 'users') {
        return Promise.resolve({ data: { role: currentRole, email: 'user@test.com' }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }

    then(onfulfilled: any) {
      let result: any = { data: null, error: null };
      if (mockError) {
        result = { data: null, error: new Error('Database error') };
      } else if (this.table === 'users') {
        result = { data: { role: currentRole, email: 'user@test.com' }, error: null };
      } else if (this.table === 'scheduled_posts') {
        result = { data: this.getFilteredPosts(), error: null };
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
      set currentRole(v) { currentRole = v; },
      get mockError() { return mockError; },
      set mockError(v) { mockError = v; },
      get mockScheduledPostsDb() { return mockScheduledPostsDb; },
      set mockScheduledPostsDb(v) { mockScheduledPostsDb = v; },
    })
  };
});

// Configure server client mock
vi.mock('@/utils/supabase/server', () => ({
  createClient: () => hoisted.mockSupabaseClient,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => hoisted.mockSupabaseClient,
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [],
    setAll: () => {},
  }),
}));

import { GET as getCalendar } from '@/app/api/calendar/route';

describe('Calendar API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const state = hoisted.getState();
    state.currentRole = 'marketer_full';
    state.mockError = false;
    state.mockScheduledPostsDb = [
      { id: 'sp1', platform: 'facebook', scheduled_at: '2026-06-18T10:00:00Z', status: 'pending', captions: { edited_content: 'FB Content' } },
      { id: 'sp2', platform: 'instagram', scheduled_at: '2026-06-20T14:30:00Z', status: 'posted', captions: { edited_content: 'IG Content' } },
      { id: 'sp3', platform: 'thread', scheduled_at: '2026-06-22T08:00:00Z', status: 'pending', captions: { edited_content: 'Threads Content' } }
    ];
    hoisted.mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'user@test.com' } }, error: null });
  });

  it('returns 401 if not authenticated', async () => {
    hoisted.mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') });
    const req = new NextRequest('http://localhost/api/calendar', { method: 'GET' });
    const res = await getCalendar(req);
    expect(res.status).toBe(401);
  });

  it('returns formatted calendar events', async () => {
    const req = new NextRequest('http://localhost/api/calendar', { method: 'GET' });
    const res = await getCalendar(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.length).toBe(3);
    
    // check formatting
    const event1 = json.data[0];
    expect(event1.id).toBe('sp1');
    expect(event1.title).toBe('FB Content');
    expect(event1.start).toBe('2026-06-18T10:00:00Z');
    expect(event1.extendedProps.platform).toBe('facebook');
    expect(event1.extendedProps.status).toBe('pending');
  });

  it('filters by date range (from / to)', async () => {
    const req = new NextRequest('http://localhost/api/calendar?from=2026-06-19T00:00:00Z&to=2026-06-21T23:59:59Z', { method: 'GET' });
    const res = await getCalendar(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.length).toBe(1);
    expect(json.data[0].id).toBe('sp2'); // only Instagram post falls inside June 19-21
  });

  it('filters by platform', async () => {
    const req = new NextRequest('http://localhost/api/calendar?platforms=facebook,threads', { method: 'GET' });
    const res = await getCalendar(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.length).toBe(2);
    expect(json.data.map((x: any) => x.id)).toContain('sp1');
    expect(json.data.map((x: any) => x.id)).toContain('sp3');
  });

  it('filters by multiple platforms using array query param platforms[]', async () => {
    const req = new NextRequest('http://localhost/api/calendar?platforms[]=facebook&platforms[]=threads', { method: 'GET' });
    const res = await getCalendar(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.length).toBe(2);
    expect(json.data.map((x: any) => x.id)).toContain('sp1');
    expect(json.data.map((x: any) => x.id)).toContain('sp3');
  });

  it('filters by multiple platforms using abbreviated platforms parameter', async () => {
    const req = new NextRequest('http://localhost/api/calendar?platforms=fb,ig', { method: 'GET' });
    const res = await getCalendar(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.length).toBe(2);
    expect(json.data.map((x: any) => x.id)).toContain('sp1');
    expect(json.data.map((x: any) => x.id)).toContain('sp2');
  });
});
