import { createClient } from '@supabase/supabase-js';
import { publishToFacebookPage } from '../facebook';
import { logAndNotifyPublishResult } from '../email';
import { createNotification } from '../services/notificationService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, serviceRoleKey);

/**
 * Kiểm tra các bài viết đã lên lịch và đến giờ đăng,
 * xuất bản lên Facebook, gửi thông báo cho người dùng và ghi nhận nhật ký.
 */
export async function runSchedulerCycle() {
  console.log(`[Scheduler] Đang kiểm tra lịch đăng bài lúc ${new Date().toISOString()}...`);

  // 1. Lấy toàn bộ các bài đăng có trạng thái 'pending' mà thời gian scheduled_at <= hiện tại
  const { data: pendingPosts, error } = await supabase
    .from('scheduled_posts')
    .select('*, captions(id, ai_content, edited_content, articles(id, title)), users(id, email)')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString());

  if (error) {
    console.error('[Scheduler] Lỗi khi tải danh sách lịch đăng chờ xử lý:', error.message);
    return;
  }

  if (!pendingPosts || pendingPosts.length === 0) {
    console.log('[Scheduler] Không có bài viết nào đến giờ cần đăng.');
    return;
  }

  console.log(`[Scheduler] Tìm thấy ${pendingPosts.length} bài đăng đến hạn cần xử lý.`);

  for (const post of pendingPosts) {
    // Thử cập nhật trạng thái của post từ 'pending' sang 'posted' trước để chiếm khóa (claim)
    const { data: claimedPost, error: claimError } = await supabase
      .from('scheduled_posts')
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', post.id)
      .eq('status', 'pending')
      .select();

    if (claimError || !claimedPost || claimedPost.length === 0) {
      console.log(`[Scheduler] Bỏ qua bài đăng ID ${post.id} do đã được xử lý bởi một luồng khác.`);
      continue;
    }

    const caption = post.captions;
    const user = post.users;
    const article = caption?.articles;

    const message = caption?.edited_content || caption?.ai_content || '';
    const postTitle = article?.title || 'Bài viết không tên';
    const recipientEmail = user?.email || '';
    const userId = user?.id || post.created_by;

    console.log(`[Scheduler] Bắt đầu đăng bài ID ${post.id}: "${postTitle}"`);

    // 2. Gọi API đăng lên Facebook Page
    const publishResult = await publishToFacebookPage(message, post.image_urls || []);

    if (publishResult.success && publishResult.postId) {
      console.log(`[Scheduler] Đăng bài ID ${post.id} thành công! ID bài viết Facebook: ${publishResult.postId}`);

      // Cập nhật thêm thông tin fb_post_id và post_result cho post đã được đánh dấu là 'posted' trước đó
      await supabase
        .from('scheduled_posts')
        .update({
          fb_post_id: publishResult.postId,
          post_result: publishResult,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      // 4. Cập nhật trạng thái caption sang 'posted'
      if (caption?.id) {
        await supabase
          .from('captions')
          .update({ status: 'posted' })
          .eq('id', caption.id);
      }

      // 5. Gửi thông báo & Ghi log thành công
      await logAndNotifyPublishResult(
        userId,
        recipientEmail,
        postTitle,
        'success',
        `Đã đăng lên Facebook Page thành công.\nPost ID: ${publishResult.postId}`
      );

      // Gửi thông báo in-app (Không ảnh hưởng luồng chính)
      try {
        await createNotification({
          userId,
          type: 'post_success',
          title: 'Đăng bài thành công',
          message: `Bài viết "${postTitle}" đã được tự động đăng lên Facebook Page thành công.`,
          metadata: {
            post_id: post.id,
            fb_post_id: publishResult.postId,
          }
        });
      } catch (err: any) {
        console.error('[Scheduler] Lỗi khi tạo thông báo thành công:', err.message);
      }
    } else {
      const errorMsg = publishResult.error || 'Lỗi không xác định từ Facebook API';
      console.error(`[Scheduler] Đăng bài ID ${post.id} thất bại:`, errorMsg);

      // Cập nhật trạng thái sang 'failed' nếu đăng tải thất bại, đồng thời xóa posted_at đã ghi trước đó
      await supabase
        .from('scheduled_posts')
        .update({
          status: 'failed',
          posted_at: null,
          failed_at: new Date().toISOString(),
          failure_reason: errorMsg,
          post_result: publishResult,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      // 4. Gửi thông báo & Ghi log thất bại
      await logAndNotifyPublishResult(
        userId,
        recipientEmail,
        postTitle,
        'failed',
        `Đăng lên Facebook Page thất bại.\nLý do: ${errorMsg}`
      );

      // Gửi thông báo in-app (Không ảnh hưởng luồng chính)
      try {
        await createNotification({
          userId,
          type: 'post_failed',
          title: 'Đăng bài thất bại',
          message: `Đăng bài "${postTitle}" lên Facebook Page thất bại. Lý do: ${errorMsg}`,
          metadata: {
            post_id: post.id,
            error: errorMsg,
          }
        });
      } catch (err: any) {
        console.error('[Scheduler] Lỗi khi tạo thông báo thất bại:', err.message);
      }
    }
  }
}

/**
 * Khởi tạo chu kỳ chạy ngầm kiểm tra lịch đăng bài (60 giây chạy một lần).
 */
export function initScheduler() {
  const globalRef = global as any;

  // Clear any existing scheduler interval to avoid duplicate loops on hot-reload
  if (globalRef.schedulerInterval) {
    clearInterval(globalRef.schedulerInterval);
  }

  console.log('[Scheduler] Khởi tạo trình chạy scheduler chạy ngầm (chu kỳ 60 giây)');

  globalRef.schedulerInterval = setInterval(async () => {
    try {
      await runSchedulerCycle();
    } catch (err: any) {
      console.error('[Scheduler] Lỗi xảy ra trong vòng lặp runSchedulerCycle:', err.message || err);
    }
  }, 60000);

  globalRef.isSchedulerInitialized = true;
}
