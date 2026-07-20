import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables (prefer .env.local)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// @ts-ignore
import cron from 'node-cron';
import { runSchedulerCycle, runPerformanceSyncCycle } from './lib/scheduler/scheduler';
import { sendDailySummaryEmails } from './lib/email';

console.log('[Worker] Đã khởi động...');

// Chạy ngay lần đầu
runSchedulerCycle().catch(console.error);

// Chạy mỗi phút cho lịch đăng bài
cron.schedule('* * * * *', async () => {
  try {
    await runSchedulerCycle();
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[Worker] Lỗi:', error.message);
  }
});

// Chạy mỗi 2 giờ để cập nhật số liệu tương tác (Facebook/Instagram/Threads)
cron.schedule('0 */2 * * *', async () => {
  try {
    console.log('[Worker] Bắt đầu chu kỳ đồng bộ số liệu tương tác...');
    const result = await runPerformanceSyncCycle();
    console.log(`[Worker] Đồng bộ hoàn tất: xử lý ${result.attempted} bài, thành công ${result.succeeded}`);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[Worker] Lỗi khi chạy đồng bộ số liệu tương tác:', error.message);
  }
});

// Chạy vào lúc 20:00 hàng ngày để gửi email báo cáo tổng hợp
cron.schedule('0 20 * * *', async () => {
  try {
    await sendDailySummaryEmails();
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[Worker] Lỗi khi gửi email tổng hợp hàng ngày:', error.message);
  }
});

