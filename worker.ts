import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

// @ts-ignore
import cron from 'node-cron';
import { runSchedulerCycle } from './lib/scheduler/scheduler';

console.log('[Worker] Đã khởi động...');

// Chạy ngay lần đầu
runSchedulerCycle().catch(console.error);

// Chạy mỗi phút
cron.schedule('* * * * *', async () => {
  try {
    await runSchedulerCycle();
  } catch (err: any) {
    console.error('[Worker] Lỗi:', err.message);
  }
});
