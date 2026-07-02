import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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
        if (f.type === 'gte') {
          filtered = filtered.filter(item => new Date(item[f.column]) >= new Date(f.value));
        } else if (f.type === 'eq') {
          filtered = filtered.filter(item => item[f.column] === f.value);
        }
      }
      return filtered;
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

import { GET as getSummary } from '@/app/api/stats/summary/route';
import { GET as getTrending } from '@/app/api/stats/trending/route';

describe('Dashboard Statistics API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const state = hoisted.getState();
    state.currentRole = 'marketer_full';
    state.mockError = false;
    
    // Set mock posts scheduled around current timezone dates
    const today = new Date();
    const oneDayAgo = new Date();
    oneDayAgo.setDate(today.getDate() - 1);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(today.getDate() - 2);

    state.mockScheduledPostsDb = [
      { id: 'sp1', platform: 'facebook', scheduled_at: today.toISOString(), created_at: today.toISOString(), status: 'posted' },
      { id: 'sp2', platform: 'facebook', scheduled_at: oneDayAgo.toISOString(), created_at: oneDayAgo.toISOString(), status: 'failed' },
      { id: 'sp3', platform: 'instagram', scheduled_at: twoDaysAgo.toISOString(), created_at: twoDaysAgo.toISOString(), status: 'posted' },
      { id: 'sp4', platform: 'threads', scheduled_at: today.toISOString(), created_at: today.toISOString(), status: 'pending' },
    ];
    hoisted.mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'user@test.com' } }, error: null });
  });

  describe('GET /api/stats/summary', () => {
    it('returns 401 if unauthorized', async () => {
      hoisted.mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') });
      const req = new NextRequest('http://localhost/api/stats/summary', { method: 'GET' });
      const res = await getSummary(req);
      expect(res.status).toBe(401);
    });

    it('aggregates summary details correctly for the past 7 days', async () => {
      const req = new NextRequest('http://localhost/api/stats/summary', { method: 'GET' });
      const res = await getSummary(req);
      expect(res.status).toBe(200);
      
      const body = await res.json();
      expect(body.total).toBe(4);
      expect(body.published).toBe(2); // sp1, sp3
      expect(body.pending).toBe(1); // sp4
      expect(body.failed).toBe(1); // sp2
      
      // Facebook success rate: 1 posted, 1 failed -> 50%
      expect(body.successRateByPlatform.facebook).toBe(50);
      // Instagram success rate: 1 posted, 0 failed -> 100%
      expect(body.successRateByPlatform.instagram).toBe(100);
      // Threads success rate: 0 posted, 0 failed -> 100%
      expect(body.successRateByPlatform.threads).toBe(100);
    });
  });

  describe('GET /api/stats/trending', () => {
    it('returns 401 if unauthorized', async () => {
      hoisted.mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') });
      const req = new NextRequest('http://localhost/api/stats/trending', { method: 'GET' });
      const res = await getTrending(req);
      expect(res.status).toBe(401);
    });

    it('returns 7-day trending array structured for Recharts', async () => {
      const req = new NextRequest('http://localhost/api/stats/trending', { method: 'GET' });
      const res = await getTrending(req);
      expect(res.status).toBe(200);
      
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(7);
      
      // Last element is today
      const todayStats = body[body.length - 1];
      expect(todayStats.facebook).toBe(1); // sp1
      expect(todayStats.threads).toBe(1); // sp4
      
      // Second to last is yesterday
      const yesterdayStats = body[body.length - 2];
      expect(yesterdayStats.facebook).toBe(1); // sp2
    });
  });
});
