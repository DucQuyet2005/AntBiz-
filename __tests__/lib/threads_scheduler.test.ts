import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  let mockScheduledPostsDb: any[] = [];
  const mockGetUser = vi.fn();

  class MockQueryBuilder {
    constructor(private table: string) {}

    select() { return this; }
    eq(field: string, value: any) { 
      if (field === 'status') this.statusFilter = value;
      if (field === 'id') this.idFilter = value;
      return this; 
    }
    lte() { return this; }
    maybeSingle() {
      if (this.table === 'linked_accounts') {
        return Promise.resolve({ data: { access_token: 'mock-token', account_id: 'act1' }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }
    update(data: any) {
      if (this.table === 'scheduled_posts') {
        if (this.idFilter) {
          mockScheduledPostsDb = mockScheduledPostsDb.map(p => p.id === this.idFilter ? { ...p, ...data } : p);
        } else {
          mockScheduledPostsDb = mockScheduledPostsDb.map(p => ({ ...p, ...data }));
        }
      }
      return this;
    }
    then(onfulfilled: any) {
      let data: any = null;
      if (this.table === 'scheduled_posts') {
        data = mockScheduledPostsDb;
      }
      return Promise.resolve({ data, error: null }).then(onfulfilled);
    }

    private statusFilter: any = null;
    private idFilter: any = null;
  }

  const mockSupabaseClient = {
    auth: { getUser: mockGetUser },
    from: (table: string) => new MockQueryBuilder(table),
  };

  return {
    mockSupabaseClient,
    mockGetUser,
    getMockScheduledPostsDb: () => mockScheduledPostsDb,
    setMockScheduledPostsDb: (val: any[]) => { mockScheduledPostsDb = val; }
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

vi.mock('@/lib/threads', () => ({
  postThread: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  logAndNotifyPublishResult: vi.fn().mockResolvedValue(true),
}));

import { runSchedulerCycle } from '@/lib/scheduler/scheduler';
import { postThread } from '@/lib/threads';

describe('Threads Scheduler Retry and Publishing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.setMockScheduledPostsDb([
      {
        id: 'sp_thread_1',
        status: 'pending',
        created_by: 'u1',
        scheduled_at: new Date(Date.now() - 1000).toISOString(),
        captions: {
          id: 'c_threads_1',
          platform: 'threads',
          edited_content: 'Threads post content',
          articles: { id: 'a1', title: 'Article Title' }
        },
        users: { id: 'u1', email: 'user@test.com' }
      }
    ]);
  });

  it('should retry up to 3 times and save threads_post_id on success', async () => {
    let calls = 0;
    vi.mocked(postThread).mockImplementation(async () => {
      calls++;
      if (calls < 3) {
        return { success: false, error: 'API Timeout' };
      }
      return { success: true, postId: 'threads_post_999' };
    });

    await runSchedulerCycle();

    expect(calls).toBe(3);
    const post = hoisted.getMockScheduledPostsDb().find(p => p.id === 'sp_thread_1');
    expect(post.status).toBe('posted');
    expect(post.threads_post_id).toBe('threads_post_999');
    expect(post.fb_post_id).toBeUndefined();
  });

  it('should mark scheduled post as failed if all 3 attempts fail', async () => {
    vi.mocked(postThread).mockResolvedValue({ success: false, error: 'Fatal Threads Error' });

    await runSchedulerCycle();

    const post = hoisted.getMockScheduledPostsDb().find(p => p.id === 'sp_thread_1');
    expect(post.status).toBe('failed');
    expect(post.threads_post_id).toBeUndefined();
  });
});
