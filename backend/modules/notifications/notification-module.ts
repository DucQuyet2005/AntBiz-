import { NotificationError } from './errors';
import { buildNotificationFilter } from './notification-filters';
import {
  parseCreateNotification,
  parseNotificationId,
  parseNotificationList,
  parseUpdateSettings,
} from './notification-schemas';
import type { NotificationRepository } from './notification-types';

interface NotificationMailInput {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message?: string;
  created_at?: string;
}

export class NotificationModule {
  constructor(private readonly repository: NotificationRepository) {}

  async listInbox(userId: string, rawInput: Parameters<typeof parseNotificationList>[0]) {
    const input = parseNotificationList(rawInput);
    const role = await this.repository.findUserRole(userId);
    const filter = buildNotificationFilter(role, input.category);
    if (filter.kind === 'empty') {
      return { data: [], count: 0, page: input.page, limit: input.limit, totalPages: 0 };
    }
    const result = await this.repository.list(userId, input.page, input.limit, filter);
    return {
      ...result,
      page: input.page,
      limit: input.limit,
      totalPages: Math.ceil(result.count / input.limit),
    };
  }

  async createForUser(callerId: string, rawInput: unknown) {
    const input = parseCreateNotification(rawInput);
    if (input.userId !== callerId) {
      const role = await this.repository.findUserRole(callerId);
      if (role !== 'admin') {
        throw new NotificationError(
          'FORBIDDEN', 403,
          'Bạn không có quyền tạo thông báo cho người dùng khác'
        );
      }
    }
    const notif = await this.repository.insert(input);
    await this.handleInstantEmail(notif);
    return notif;
  }

  async createInternal(rawInput: unknown) {
    const notif = await this.repository.insert(parseCreateNotification(rawInput));
    await this.handleInstantEmail(notif);
    return notif;
  }

  async createManyInternal(rawInputs: unknown[]) {
    if (!rawInputs?.length) return [];
    const inputs = rawInputs.map(parseCreateNotification);
    const notifications = await this.repository.insertMany(inputs);
    for (const notif of notifications) {
      await this.handleInstantEmail(notif);
    }
    return notifications;
  }

  private async handleInstantEmail(notif: NotificationMailInput) {
    if (notif.type !== 'post_success' && notif.type !== 'post_failed') {
      return;
    }

    try {
      let settings: Record<string, any> | null = await this.repository.getUserSettings(notif.user_id);

      // Check request cookies if available in Next.js Server environment
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        const cookieDigest = cookieStore.get('notif_email_digest_enabled')?.value;
        const cookieSuccess = cookieStore.get('notif_email_on_success')?.value;
        const cookieFailed = cookieStore.get('notif_email_on_failure')?.value;

        if (cookieDigest !== undefined) {
          settings = settings || {};
          settings.email_digest_enabled = cookieDigest === 'true';
        }
        if (cookieSuccess !== undefined) {
          settings = settings || {};
          settings.email_on_success = cookieSuccess === 'true';
        }
        if (cookieFailed !== undefined) {
          settings = settings || {};
          settings.email_on_failure = cookieFailed === 'true';
        }
      } catch {
        // cookies() not available outside request context (e.g. cron tasks)
      }

      if (!settings || !settings.email) {
        return;
      }

      // If user enabled daily digest, we skip sending instant emails (they will receive daily digest summary)
      if (settings.email_digest_enabled) {
        console.log(`[NotificationModule] Daily digest is enabled for user ${notif.user_id}. Skipping instant email.`);
        return;
      }

      const shouldSend = 
        (notif.type === 'post_success' && settings.email_on_success !== false) ||
        (notif.type === 'post_failed' && settings.email_on_failure !== false);

      if (shouldSend) {
        const { sendEmail } = await import('@/lib/email');
        const subject = notif.type === 'post_success'
          ? `[AntBiz] Đăng bài thành công: ${notif.title}`
          : `[AntBiz] Đăng bài thất bại: ${notif.title}`;
        
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #1a202c;">
            <h2 style="color: ${notif.type === 'post_success' ? '#166534' : '#991b1b'}; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 0;">
              ${notif.type === 'post_success' ? '✓ Đăng bài thành công' : '✗ Đăng bài thất bại'}
            </h2>
            <p>Xin chào,</p>
            <p>Hệ thống AntBiz thông báo bài đăng của bạn có kết quả như sau:</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 15px 0;">
              <strong>Tiêu đề bài viết:</strong> ${notif.title}<br/>
              <strong>Trạng thái:</strong> ${notif.type === 'post_success' ? 'Thành công' : 'Thất bại'}<br/>
              ${notif.message ? `<strong>Chi tiết:</strong> ${notif.message}` : ''}
            </div>
            <p style="font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
              Email này được gửi tự động dựa trên cấu hình nhận thông báo tức thời của bạn. Bạn có thể tắt email bất kỳ lúc nào trong phần Cài đặt của AntBiz.
            </p>
          </div>
        `;

        await sendEmail({
          to: settings.email,
          subject,
          text: notif.message || subject,
          html
        });

        // Mark as sent
        await this.repository.markEmailsAsSent([notif.id]);
      } else {
        // User disabled instant email for this type, so we mark it as sent so daily digest won't pick it up either
        await this.repository.markEmailsAsSent([notif.id]);
      }
    } catch (err) {
      console.error('[NotificationModule] Error handling instant email:', err);
    }
  }

  async markRead(userId: string, rawId: unknown) {
    const id = parseNotificationId(rawId);
    const notification = await this.repository.markRead(userId, id);
    if (!notification) {
      throw new NotificationError('NOT_FOUND', 404, 'Không tìm thấy thông báo');
    }
    return notification;
  }

  markAllRead(userId: string) {
    return this.repository.markAllRead(userId);
  }

  async getUserSettings(userId: string) {
    const settings = await this.repository.getUserSettings(userId);
    if (!settings) {
      return {
        email_on_success: true,
        email_on_failure: true,
        email_digest_enabled: false,
        email_digest_time: '18:00',
      };
    }
    return settings;
  }

  async updateUserSettings(userId: string, rawInput: unknown) {
    const settings = parseUpdateSettings(rawInput);
    return this.repository.updateUserSettings(userId, settings);
  }

  async processDailyDigests(currentHour: string, sendMailFn: (options: { to: string; subject: string; text: string; html?: string }) => Promise<{ success: boolean; error?: string }>) {
    const users = await this.repository.findUsersForDigest(currentHour);
    let sentEmailsCount = 0;

    for (const user of users) {
      const unsent = await this.repository.findUnsentEmailNotifications(user.id);
      
      // Update last_digest_sent_at to mark as processed today
      await this.repository.updateUserSettings(user.id, {
        last_digest_sent_at: new Date().toISOString()
      } as any);

      if (unsent.length === 0) {
        continue;
      }

      // Aggregate notifications
      const successPosts = unsent.filter(n => n.type === 'post_success');
      const failedPosts = unsent.filter(n => n.type === 'post_failed');

      const successCount = successPosts.length;
      const failedCount = failedPosts.length;

      // Build beautiful HTML report
      const emailSubject = `[AntBiz] Báo cáo tổng hợp kết quả đăng bài ngày ${new Date().toLocaleDateString('vi-VN')}`;
      
      let htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #1a202c;">
          <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 0;">
            Báo cáo kết quả đăng bài hàng ngày
          </h2>
          <p>Xin chào,</p>
          <p>Hệ thống AntBiz xin gửi bạn báo cáo tổng hợp kết quả đăng bài tự động trong ngày hôm nay:</p>
          
          <div style="display: flex; margin: 20px 0; gap: 15px;">
            <div style="flex: 1; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px; text-align: center;">
              <span style="font-size: 24px; font-weight: bold; color: #166534;">${successCount}</span>
              <div style="font-size: 13px; color: #166534; margin-top: 5px;">Thành công</div>
            </div>
            <div style="flex: 1; background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 15px; text-align: center;">
              <span style="font-size: 24px; font-weight: bold; color: #991b1b;">${failedCount}</span>
              <div style="font-size: 13px; color: #991b1b; margin-top: 5px;">Thất bại</div>
            </div>
          </div>
      `;

      if (unsent.length > 0) {
        htmlContent += `
          <h3 style="color: #4f46e5; margin-top: 25px; font-size: 16px; font-weight: bold; margin-bottom: 8px;">Danh sách bài đăng (${unsent.length})</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f8fafc; text-align: left; font-size: 13px;">
                <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Tên bài đăng</th>
                <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Thời gian đăng</th>
                <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Trạng thái đăng</th>
              </tr>
            </thead>
            <tbody>
        `;
        
        for (const post of unsent) {
          const time = new Date(post.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          const isSuccess = post.type === 'post_success';
          const statusText = isSuccess ? 'Thành công' : 'Thất bại';
          const statusColor = isSuccess ? '#166534' : '#b91c1c';
          const details = !isSuccess && post.message ? `<br/><span style="font-size: 11px; color: #64748b;">Lý do: ${post.message}</span>` : '';
          
          htmlContent += `
            <tr style="font-size: 13px;">
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: 500;">${post.title}${details}</td>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #64748b;">${time}</td>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: ${statusColor}; font-weight: 600;">${statusText}</td>
            </tr>
          `;
        }
        
        htmlContent += `</tbody></table>`;
      }

      htmlContent += `
          <p style="margin-top: 30px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center;">
            Email này được gửi tự động dựa trên cấu hình nhận email tổng hợp của bạn trên hệ thống AntBiz. Bạn có thể thay đổi cấu hình này bất cứ lúc nào trong phần cài đặt thông báo.
          </p>
        </div>
      `;

      const textFallback = `Báo cáo tổng hợp kết quả đăng bài ngày ${new Date().toLocaleDateString('vi-VN')}:\n\nThành công: ${successCount}\nThất bại: ${failedCount}`;

      await sendMailFn({
        to: user.email,
        subject: emailSubject,
        text: textFallback,
        html: htmlContent
      });

      // Mark these notifications as sent
      await this.repository.markEmailsAsSent(unsent.map(n => n.id));
      sentEmailsCount++;
    }

    return { processedUsersCount: users.length, sentEmailsCount };
  }
}
