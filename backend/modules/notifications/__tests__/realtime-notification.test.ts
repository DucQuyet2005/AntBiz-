import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNotificationModule } from '../notification-factory';
import { sendEmail } from '@/lib/email';

// Mock the email helper module
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true })
}));

describe('Realtime Notification Logic & Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create database notification and trigger instant email if configured', async () => {
    // 1. Mock Supabase Client and settings
    const mockSupabase = {
      from: vi.fn().mockImplementation((table) => {
        if (table === 'notifications') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            // Mock single() to return resolved database record wrapped in { data, error }
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'notif_789', 
                user_id: 'user_123', 
                type: 'post_success', 
                title: 'Đăng bài thành công', 
                message: 'Bài viết Facebook của bạn đã được đăng thành công.',
                created_at: new Date().toISOString()
              },
              error: null
            }),
            // Promise-like behavior for insert/select sequence
            then: function(onfulfilled: any) {
              return Promise.resolve({
                data: {
                  id: 'notif_789', 
                  user_id: 'user_123', 
                  type: 'post_success', 
                  title: 'Đăng bài thành công', 
                  message: 'Bài viết Facebook của bạn đã được đăng thành công.',
                  created_at: new Date().toISOString()
                },
                error: null
              }).then(onfulfilled);
            }
          };
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'user_123',
                email: 'marketer@antbiz.vn',
                email_on_success: true,
                email_on_failure: true,
                email_digest_enabled: false,
                email_digest_time: '08:00'
              },
              error: null
            }),
            then: function(onfulfilled: any) {
              return Promise.resolve({
                data: {
                  id: 'user_123',
                  email: 'marketer@antbiz.vn',
                  email_on_success: true,
                  email_on_failure: true,
                  email_digest_enabled: false,
                  email_digest_time: '08:00'
                },
                error: null
              }).then(onfulfilled);
            }
          };
        }
        return {};
      })
    } as any;

    const notificationModule = createNotificationModule(mockSupabase);

    // 2. Execute createInternal
    const notif = await notificationModule.createInternal({
      userId: 'user_123',
      type: 'post_success',
      title: 'Đăng bài thành công',
      message: 'Bài viết Facebook của bạn đã được đăng thành công.'
    });

    // 3. Verify database notification was created
    expect(notif).toBeDefined();
    
    // 4. Verify email dispatch via mocked sendEmail helper
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const emailCallArgs = vi.mocked(sendEmail).mock.calls[0][0];
    expect(emailCallArgs.to).toBe('marketer@antbiz.vn');
    expect(emailCallArgs.subject).toContain('Đăng bài thành công');
    expect(emailCallArgs.html).toContain('Bài viết Facebook của bạn đã được đăng thành công.');
  });

  it('should skip instant email if user preferences opt-out', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table) => {
        if (table === 'notifications') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'notif_789', 
                user_id: 'user_123', 
                type: 'post_success', 
                title: 'Đăng bài thành công', 
                message: 'Bài viết Facebook',
                created_at: new Date().toISOString()
              },
              error: null
            }),
            then: function(onfulfilled: any) {
              return Promise.resolve({
                data: {
                  id: 'notif_789', 
                  user_id: 'user_123', 
                  type: 'post_success', 
                  title: 'Đăng bài thành công', 
                  message: 'Bài viết Facebook',
                  created_at: new Date().toISOString()
                },
                error: null
              }).then(onfulfilled);
            }
          };
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'user_123',
                email: 'marketer@antbiz.vn',
                email_on_success: false, // OPTED OUT!
                email_on_failure: true,
                email_digest_enabled: false,
                email_digest_time: '08:00'
              },
              error: null
            }),
            then: function(onfulfilled: any) {
              return Promise.resolve({
                data: {
                  id: 'user_123',
                  email: 'marketer@antbiz.vn',
                  email_on_success: false,
                  email_on_failure: true,
                  email_digest_enabled: false,
                  email_digest_time: '08:00'
                },
                error: null
              }).then(onfulfilled);
            }
          };
        }
        return {};
      })
    } as any;

    const notificationModule = createNotificationModule(mockSupabase);

    const notif = await notificationModule.createInternal({
      userId: 'user_123',
      type: 'post_success',
      title: 'Đăng bài thành công',
      message: 'Bài viết Facebook'
    });

    expect(notif).toBeDefined();
    expect(sendEmail).not.toHaveBeenCalled(); // Should be skipped!
  });
});
