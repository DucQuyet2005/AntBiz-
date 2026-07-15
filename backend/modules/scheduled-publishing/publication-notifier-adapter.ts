import { logAndNotifyPublishResult } from '@/lib/email';
import { createNotification } from '@/lib/services/notificationService';
import type {
  PublicationNotificationInput,
  PublicationNotifier,
  SchedulingNotificationInput,
} from './scheduled-publishing-types';

export class ProductionPublicationNotifier implements PublicationNotifier {
  async scheduling(input: SchedulingNotificationInput) {
    const rescheduled = input.kind === 'rescheduled';
    const timeLabel = new Date(input.post.scheduled_at).toLocaleString('vi-VN');
    await createNotification({
      userId: input.userId,
      type: 'info',
      title: rescheduled ? 'Đã thay đổi lịch đăng bài' : 'Đã lên lịch bài đăng',
      message: rescheduled
        ? `Bài viết "${input.articleTitle}" đã được dời lịch đăng sang lúc ${timeLabel}.`
        : `Bài viết "${input.articleTitle}" đã được lên lịch đăng tải thành công vào lúc ${timeLabel}.`,
      metadata: {
        post_id: input.post.id,
        scheduled_at: input.post.scheduled_at,
        platform: input.post.platform,
      },
    });
  }

  async publication(input: PublicationNotificationInput) {
    const status = input.result.success ? 'success' : 'failed';
    const detail = input.result.success
      ? `Đã đăng lên ${input.platformName} thành công.\nPost ID: ${input.result.postId}`
      : `Đăng lên ${input.platformName} thất bại.\nLý do: ${input.result.error}`;
    try {
      await logAndNotifyPublishResult(
        input.userId, input.userEmail, input.postTitle, status, detail
      );
    } catch (error) {
      console.error('[Scheduled Publishing] Publish email/audit failed:', error);
    }
    try {
      await createNotification({
        userId: input.userId,
        type: input.result.success ? 'post_success' : 'post_failed',
        title: input.result.success ? 'Đăng bài thành công' : 'Đăng bài thất bại',
        message: input.result.success
          ? `Bài viết "${input.postTitle}" đã được tự động đăng lên ${input.platformName} thành công.`
          : `Đăng bài "${input.postTitle}" lên ${input.platformName} thất bại. Lý do: ${input.result.error}`,
        metadata: input.result.success
          ? { post_id: input.post.id, external_post_id: input.result.postId }
          : { post_id: input.post.id, error: input.result.error },
      });
    } catch (error) {
      console.error('[Scheduled Publishing] In-app publication notification failed:', error);
    }
  }
}
