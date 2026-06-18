import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Hoisted block to define variables and class before imports are executed
const hoisted = vi.hoisted(() => {
  let currentRole = 'marketer_full';
  let mockError = false;
  let mockCancelError = false;
  let mockCaptionsDb: any[] = [];
  let mockScheduledPostsDb: any[] = [];
  let mockAuditLogsDb: any[] = [];
  const mockGetUser = vi.fn();

  class MockQueryBuilder {
    constructor(private table: string) {}

    select(columns?: string, options?: any) {
      return this;
    }

    eq(column: string, value: any) {
      return this;
    }

    lte(column: string, value: any) {
      return this;
    }

    order(column: string, options?: any) {
      return this;
    }

    maybeSingle() {
      if (mockError) {
        return Promise.resolve({ data: null, error: new Error('Database error') });
      }
      if (this.table === 'users') {
        return Promise.resolve({ data: { role: currentRole, email: 'user@test.com' }, error: null });
      }
      if (this.table === 'captions') {
        const caption = mockCaptionsDb[0];
        return Promise.resolve({ data: caption || null, error: null });
      }
      if (this.table === 'scheduled_posts') {
        const post = mockScheduledPostsDb[0];
        return Promise.resolve({ data: post || null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }

    single() {
      if (mockError) {
        return Promise.resolve({ data: null, error: new Error('Database error') });
      }
      if (this.table === 'users') {
        return Promise.resolve({ data: { role: currentRole, email: 'user@test.com' }, error: null });
      }
      if (this.table === 'scheduled_posts') {
        const post = mockScheduledPostsDb[0];
        return Promise.resolve({ data: post || null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }

    insert(data: any) {
      if (mockError) {
        return this;
      }
      if (this.table === 'scheduled_posts') {
        const newPost = { id: 'sp1', ...data };
        mockScheduledPostsDb.push(newPost);
      } else if (this.table === 'audit_logs') {
        mockAuditLogsDb.push(data);
      }
      return this;
    }

    update(data: any) {
      if (mockError || (mockCancelError && this.table === 'scheduled_posts')) {
        return this;
      }
      if (this.table === 'scheduled_posts') {
        mockScheduledPostsDb = mockScheduledPostsDb.map((p: any) => ({ ...p, ...data }));
      } else if (this.table === 'captions') {
        mockCaptionsDb = mockCaptionsDb.map((c: any) => ({ ...c, ...data }));
      }
      return this;
    }

    then(onfulfilled: any) {
      let result: any = { data: null, error: null };
      if (mockError) {
        result = { data: null, error: new Error('Database error') };
      } else if (this.table === 'users') {
        result = { data: { role: currentRole, email: 'user@test.com' }, error: null };
      } else if (this.table === 'scheduled_posts') {
        result = { data: mockScheduledPostsDb, error: null };
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
      set currentRole(v) { currentRole = v; },
      get mockError() { return mockError; },
      set mockError(v) { mockError = v; },
      get mockCancelError() { return mockCancelError; },
      set mockCancelError(v) { mockCancelError = v; },
      get mockCaptionsDb() { return mockCaptionsDb; },
      set mockCaptionsDb(v) { mockCaptionsDb = v; },
      get mockScheduledPostsDb() { return mockScheduledPostsDb; },
      set mockScheduledPostsDb(v) { mockScheduledPostsDb = v; },
      get mockAuditLogsDb() { return mockAuditLogsDb; },
      set mockAuditLogsDb(v) { mockAuditLogsDb = v; },
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

vi.mock('@/lib/facebook', () => ({
  publishToFacebookPage: vi.fn().mockResolvedValue({ success: true, postId: 'fb_post_123' }),
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ messageId: 'msg123' }),
  logAndNotifyPublishResult: vi.fn().mockResolvedValue(true),
}));

// Now safely import the modules, knowing their dependency evaluations will read from the mocked client.
import { POST as createScheduledPost, GET as getScheduledPosts } from '@/app/api/scheduled-posts/route';
import { POST as cancelScheduledPost } from '@/app/api/scheduled-posts/[id]/cancel/route';
import { runSchedulerCycle } from '@/lib/scheduler/scheduler';

describe('Scheduled Posts API Endpoint & Scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const state = hoisted.getState();
    state.currentRole = 'marketer_full';
    state.mockError = false;
    state.mockCancelError = false;
    state.mockCaptionsDb = [{ id: 'c1', platform: 'facebook', ai_content: 'Mock Caption' }];
    state.mockScheduledPostsDb = [];
    state.mockAuditLogsDb = [];
    hoisted.mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'user@test.com' } }, error: null });
  });

  it('GET returns 401 if not authenticated', async () => {
    hoisted.mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') });
    const req = new NextRequest('http://localhost/api/scheduled-posts', {
      method: 'GET',
    });
    const res = await getScheduledPosts(req);
    expect(res.status).toBe(401);
  });

  it('GET returns scheduled posts for authenticated user', async () => {
    const state = hoisted.getState();
    state.mockScheduledPostsDb = [{ id: 'sp1', caption_id: 'c1', platform: 'facebook', status: 'pending' }];
    const req = new NextRequest('http://localhost/api/scheduled-posts', {
      method: 'GET',
    });
    const res = await getScheduledPosts(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.length).toBe(1);
    expect(json.data[0].id).toBe('sp1');
  });

  it('POST creates scheduled post successfully', async () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour in future
    const req = new NextRequest('http://localhost/api/scheduled-posts', {
      method: 'POST',
      body: JSON.stringify({
        captionId: 'c1',
        scheduledAt: futureDate,
        imageUrls: ['http://test.com/img.jpg'],
      }),
    });
    const res = await createScheduledPost(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.caption_id).toBe('c1');
    expect(hoisted.getState().mockCaptionsDb[0].status).toBe('scheduled');
  });

  it('POST returns 400 for past scheduled dates', async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour in past
    const req = new NextRequest('http://localhost/api/scheduled-posts', {
      method: 'POST',
      body: JSON.stringify({
        captionId: 'c1',
        scheduledAt: pastDate,
      }),
    });
    const res = await createScheduledPost(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('thời gian trong tương lai');
  });

  it('POST returns 404 if caption is not found', async () => {
    hoisted.getState().mockCaptionsDb = []; // Empty
    const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    const req = new NextRequest('http://localhost/api/scheduled-posts', {
      method: 'POST',
      body: JSON.stringify({
        captionId: 'nonexistent',
        scheduledAt: futureDate,
      }),
    });
    const res = await createScheduledPost(req);
    expect(res.status).toBe(404);
  });

  it('POST /cancel cancels a pending scheduled post', async () => {
    const state = hoisted.getState();
    state.mockScheduledPostsDb = [{ id: 'sp1', caption_id: 'c1', platform: 'facebook', status: 'pending', created_by: 'u1' }];
    state.mockCaptionsDb = [{ id: 'c1', status: 'scheduled' }];

    const req = new NextRequest('http://localhost/api/scheduled-posts/sp1/cancel', {
      method: 'POST',
    });
    const res = await cancelScheduledPost(req, { params: { id: 'sp1' } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain('Đã hủy lịch đăng bài');
    expect(state.mockScheduledPostsDb[0].status).toBe('cancelled');
    expect(state.mockCaptionsDb[0].status).toBe('approved');
  });

  it('POST /cancel fails if the post is not pending', async () => {
    hoisted.getState().mockScheduledPostsDb = [{ id: 'sp1', caption_id: 'c1', platform: 'facebook', status: 'posted', created_by: 'u1' }];
    const req = new NextRequest('http://localhost/api/scheduled-posts/sp1/cancel', {
      method: 'POST',
    });
    const res = await cancelScheduledPost(req, { params: { id: 'sp1' } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Không thể hủy lịch đăng bài ở trạng thái: posted');
  });

  it('POST /cancel returns 404 if scheduled post not found', async () => {
    hoisted.getState().mockScheduledPostsDb = [];
    const req = new NextRequest('http://localhost/api/scheduled-posts/sp1/cancel', {
      method: 'POST',
    });
    const res = await cancelScheduledPost(req, { params: { id: 'sp1' } });
    expect(res.status).toBe(404);
  });

  it('runSchedulerCycle runs and publishes pending due posts', async () => {
    const state = hoisted.getState();
    state.mockScheduledPostsDb = [{ id: 'sp1', caption_id: 'c1', platform: 'facebook', status: 'pending', scheduled_at: new Date().toISOString(), created_by: 'u1' }];
    state.mockCaptionsDb = [{ id: 'c1', ai_content: 'Mock message content', platform: 'facebook' }];

    await runSchedulerCycle();
    
    expect(state.mockScheduledPostsDb[0].status).toBe('posted');
    expect(state.mockScheduledPostsDb[0].fb_post_id).toBe('fb_post_123');
  });
});
