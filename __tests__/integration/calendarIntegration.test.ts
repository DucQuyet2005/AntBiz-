import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Top level variable starting with 'mock' to be accessible in vi.mock
const mockNotificationsDb: any[] = [];

// Hoist variables for Vitest mock
const hoisted = vi.hoisted(() => {
  let currentRole = 'marketer_full';
  let mockScheduledPostsDb: any[] = [];
  const mockGetUser = vi.fn();

  class MockQueryBuilder {
    private filters: { type: string; column: string; value: any }[] = [];
    private updateData: any = null;
    constructor(private table: string) {}

    select(columns?: string) {
      return this;
    }

    eq(column: string, value: any) {
      this.filters.push({ type: 'eq', column, value });
      return this;
    }

    update(data: any) {
      this.updateData = data;
      return this;
    }

    private executeUpdate() {
      if (this.table === 'scheduled_posts' && this.updateData) {
        const idFilter = this.filters.find(f => f.column === 'id' && f.type === 'eq');
        if (idFilter) {
          mockScheduledPostsDb = mockScheduledPostsDb.map(p => {
            if (p.id === idFilter.value) {
              return { ...p, ...this.updateData };
            }
            return p;
          });
        }
      }
    }

    single() {
      this.executeUpdate();
      if (this.table === 'users') {
        return Promise.resolve({ data: { role: currentRole, email: 'user@test.com' }, error: null });
      }
      if (this.table === 'scheduled_posts') {
        const idFilter = this.filters.find(f => f.column === 'id' && f.type === 'eq');
        const post = mockScheduledPostsDb.find(p => p.id === (idFilter?.value || ''));
        return Promise.resolve({ data: post || null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }

    then(onfulfilled: any) {
      this.executeUpdate();
      let result: any = { data: null, error: null };
      if (this.table === 'users') {
        result = { data: { role: currentRole, email: 'user@test.com' }, error: null };
      } else if (this.table === 'scheduled_posts') {
        const idFilter = this.filters.find(f => f.column === 'id' && f.type === 'eq');
        const post = mockScheduledPostsDb.find(p => p.id === (idFilter?.value || ''));
        result = { data: post ? [post] : [], error: null };
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
      get mockScheduledPostsDb() { return mockScheduledPostsDb; },
      set mockScheduledPostsDb(v) { mockScheduledPostsDb = v; }
    })
  };
});

// Configure mocks using the hoisted variables
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

vi.mock('@/lib/services/notificationService', () => ({
  createNotification: vi.fn().mockImplementation((notif) => {
    mockNotificationsDb.push(notif);
    return Promise.resolve(notif);
  })
}));

import { PUT as reschedulePostPut } from '@/app/api/scheduled-posts/[id]/route';

describe('Calendar Integration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const state = hoisted.getState();
    state.currentRole = 'marketer_full';
    state.mockScheduledPostsDb = [
      { 
        id: 'sp-drag-1', 
        platform: 'facebook', 
        scheduled_at: '2026-07-01T10:00:00Z', 
        status: 'pending', 
        captions: { id: 'c1', articles: { title: 'Dự án AntBiz' } } 
      }
    ];
    mockNotificationsDb.length = 0; // clear array
    hoisted.mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'user@test.com' } }, error: null });
  });

  it('updates rescheduled time correctly when event is dropped on a new slot', async () => {
    const newSlotTime = '2026-07-01T15:30:00Z';
    const req = new NextRequest('http://localhost/api/scheduled-posts/sp-drag-1', {
      method: 'PUT',
      body: JSON.stringify({ scheduledAt: newSlotTime }),
    });

    const params = Promise.resolve({ id: 'sp-drag-1' });
    const res = await reschedulePostPut(req, { params });

    expect(res.status).toBe(200);
    const json = await res.json();
    
    // verify reschedule update
    expect(new Date(json.data.scheduled_at).toISOString()).toBe(new Date(newSlotTime).toISOString());
    expect(new Date(hoisted.getState().mockScheduledPostsDb[0].scheduled_at).toISOString()).toBe(new Date(newSlotTime).toISOString());

    // verify in-app notification created
    expect(mockNotificationsDb.length).toBe(1);
    expect(mockNotificationsDb[0].title).toContain('Đã thay đổi lịch đăng bài');
  });
});
