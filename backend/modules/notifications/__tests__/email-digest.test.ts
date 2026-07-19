import { describe, it, expect, vi } from 'vitest';
import { createNotificationModule } from '../notification-factory';

describe('Email Digest Notification Logic', () => {
  it('should filter, format and send daily digest successfully', async () => {
    // 1. Mock Supabase Client
    const mockSupabase = {
      from: vi.fn().mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'user_123',
                email: 'marketer@antbiz.vn',
                email_digest_enabled: true,
                email_digest_time: '08:00',
                last_digest_sent_at: null
              },
              error: null
            }),
            // Promise-like behavior for query builder chaining
            then: function(onfulfilled: any) {
              return Promise.resolve({
                data: [
                  {
                    id: 'user_123',
                    email: 'marketer@antbiz.vn',
                    email_digest_time: '08:00',
                    last_digest_sent_at: null
                  }
                ],
                error: null
              }).then(onfulfilled);
            }
          };
        }
        if (table === 'notifications') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            then: function(onfulfilled: any) {
              return Promise.resolve({
                data: [
                  { id: '1', type: 'post_success', title: 'Đăng bài thành công', message: 'Bài viết Facebook của bạn đã được đăng thành công.', created_at: new Date().toISOString() },
                  { id: '2', type: 'post_failed', title: 'Đăng bài thất bại', message: 'Bài viết Tiktok của bạn bị lỗi cấu hình token.', created_at: new Date().toISOString() }
                ],
                error: null
              }).then(onfulfilled);
            }
          };
        }
        return {};
      })
    } as any;

    const notificationModule = createNotificationModule(mockSupabase);
    const mockSendEmail = vi.fn().mockResolvedValue({ success: true });

    // 2. Execute processDailyDigests
    const result = await notificationModule.processDailyDigests('08:00', mockSendEmail);

    // 3. Verify
    expect(result.processedUsersCount).toBe(1);
    expect(result.sentEmailsCount).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    
    const emailCallArgs = mockSendEmail.mock.calls[0][0];
    expect(emailCallArgs.to).toBe('marketer@antbiz.vn');
    expect(emailCallArgs.subject).toContain('Báo cáo tổng hợp');
    expect(emailCallArgs.html).toContain('Đăng bài thành công');
    expect(emailCallArgs.html).toContain('Đăng bài thất bại');
  });

  it('should skip users without daily digest enabled', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: function(onfulfilled: any) {
              return Promise.resolve({
                data: [], // No users scheduled
                error: null
              }).then(onfulfilled);
            }
          };
        }
        return {};
      })
    } as any;

    const notificationModule = createNotificationModule(mockSupabase);
    const mockSendEmail = vi.fn();

    const result = await notificationModule.processDailyDigests('08:00', mockSendEmail);

    expect(result.processedUsersCount).toBe(0);
    expect(result.sentEmailsCount).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
