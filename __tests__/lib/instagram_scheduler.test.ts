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

vi.mock('@/lib/instagram', () => ({
  publishToInstagram: vi.fn(),
  publishMedia: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  logAndNotifyPublishResult: vi.fn().mockResolvedValue(true),
}));

import { runSchedulerCycle } from '@/lib/scheduler/scheduler';
import { publishToInstagram } from '@/lib/instagram';

describe('Instagram Scheduler Retry and Publishing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.setMockScheduledPostsDb([
      {
        id: 'sp_ig_1',
        status: 'pending',
        created_by: 'u1',
        scheduled_at: new Date(Date.now() - 1000).toISOString(),
        image_urls: ['http://example.com/photo.jpg'],
        captions: {
          id: 'c_ig_1',
          platform: 'instagram',
          edited_content: 'Instagram photo caption',
          articles: { id: 'a1', title: 'Article Title' }
        },
        users: { id: 'u1', email: 'user@test.com' }
      }
    ]);
  });

  it('should retry up to 3 times and save instagram_media_id on success', async () => {
    let calls = 0;
    vi.mocked(publishToInstagram).mockImplementation(async () => {
      calls++;
      if (calls < 3) {
        return { success: false, error: 'Network Error' };
      }
      return { success: true, postId: 'ig_media_999' };
    });

    await runSchedulerCycle();

    expect(calls).toBe(3);
    const post = hoisted.getMockScheduledPostsDb().find(p => p.id === 'sp_ig_1');
    expect(post.status).toBe('posted');
    expect(post.instagram_media_id).toBe('ig_media_999');
    expect(post.fb_post_id).toBeUndefined();
  });

  it('should mark scheduled post as failed if all 3 attempts fail', async () => {
    vi.mocked(publishToInstagram).mockResolvedValue({ success: false, error: 'Fatal Graph API Error' });

    await runSchedulerCycle();

    const post = hoisted.getMockScheduledPostsDb().find(p => p.id === 'sp_ig_1');
    expect(post.status).toBe('failed');
    expect(post.instagram_media_id).toBeUndefined();
  });
});
