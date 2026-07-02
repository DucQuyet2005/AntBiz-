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

    lte(column: string, value: any) {
      this.filters.push({ type: 'lte', column, value });
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
        } else if (f.type === 'lte') {
          filtered = filtered.filter(item => new Date(item[f.column]) <= new Date(f.value));
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

import { GET as exportIcal } from '@/app/api/calendar/export/ical/route';
import { GET as exportCsv } from '@/app/api/calendar/export/csv/route';

describe('Calendar Export API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const state = hoisted.getState();
    state.currentRole = 'marketer_full';
    state.mockError = false;
    state.mockScheduledPostsDb = [
      { id: 'sp1', platform: 'facebook', scheduled_at: '2026-06-18T10:00:00Z', created_at: '2026-06-18T09:00:00Z', status: 'pending', captions: { edited_content: 'FB Post' } },
      { id: 'sp2', platform: 'instagram', scheduled_at: '2026-06-20T14:30:00Z', created_at: '2026-06-20T14:00:00Z', status: 'posted', captions: { edited_content: 'IG Post' } },
    ];
    hoisted.mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'user@test.com' } }, error: null });
  });

  describe('GET /api/calendar/export/ical', () => {
    it('returns 401 if not authenticated', async () => {
      hoisted.mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') });
      const req = new NextRequest('http://localhost/api/calendar/export/ical', { method: 'GET' });
      const res = await exportIcal(req);
      expect(res.status).toBe(401);
    });

    it('exports scheduled posts to valid iCal .ics format', async () => {
      const req = new NextRequest('http://localhost/api/calendar/export/ical?from=2026-06-01T00:00:00Z&to=2026-06-30T23:59:59Z', { method: 'GET' });
      const res = await exportIcal(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/calendar');
      expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="calendar.ics"');

      const body = await res.text();
      expect(body).toContain('BEGIN:VCALENDAR');
      expect(body).toContain('VERSION:2.0');
      expect(body).toContain('BEGIN:VEVENT');
      expect(body).toContain('SUMMARY:[Facebook] FB Post');
      expect(body).toContain('SUMMARY:[Instagram] IG Post');
      expect(body).toContain('DESCRIPTION:Kênh đăng: Facebook\\nTrạng thái: Chờ đăng (Scheduled)');
      expect(body).toContain('END:VCALENDAR');
    });
  });

  describe('GET /api/calendar/export/csv', () => {
    it('returns 401 if not authenticated', async () => {
      hoisted.mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') });
      const req = new NextRequest('http://localhost/api/calendar/export/csv', { method: 'GET' });
      const res = await exportCsv(req);
      expect(res.status).toBe(401);
    });

    it('exports scheduled posts to valid CSV format', async () => {
      const req = new NextRequest('http://localhost/api/calendar/export/csv?from=2026-06-01T00:00:00Z&to=2026-06-30T23:59:59Z', { method: 'GET' });
      const res = await exportCsv(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/csv');
      expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="calendar.csv"');

      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      // Check for UTF-8 BOM bytes (EF BB BF)
      expect(bytes[0]).toBe(0xEF);
      expect(bytes[1]).toBe(0xBB);
      expect(bytes[2]).toBe(0xBF);

      const decoder = new TextDecoder('utf-8');
      const cleanBody = decoder.decode(buffer);
      const lines = cleanBody.split('\r\n');
      expect(lines[0]).toBe('"LỊCH ĐĂNG BÀI ĐA NỀN TẢNG",,,');
      expect(lines[1]).toBe('Tiêu đề,Kênh đăng,Thời gian đăng,Trạng thái');
      expect(lines[2]).toContain('"FB Post"');
      expect(lines[2]).toContain('"Facebook"');
      expect(lines[2]).toContain('"\u200b17:00 18/06/2026"');
      expect(lines[2]).toContain('"Chờ đăng"');
      expect(lines[3]).toContain('"IG Post"');
      expect(lines[3]).toContain('"Instagram"');
      expect(lines[3]).toContain('"\u200b21:30 20/06/2026"');
      expect(lines[3]).toContain('"Đã đăng"');
    });
  });
});
