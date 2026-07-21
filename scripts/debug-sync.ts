import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Polyfill WebSocket for Node.js < 22 where it is not defined
if (typeof (global as any).WebSocket === 'undefined') {
  (global as any).WebSocket = class {};
}

import { createServiceRoleClient } from '../lib/api/auth';
import { createPostPerformanceModule } from '../backend/modules/post-performance/post-performance-factory';

async function main() {
  console.log('[Debug Sync] Khởi động tiến trình lấy số liệu thật từ Facebook...');
  const supabase = createServiceRoleClient();
  const performanceModule = createPostPerformanceModule(supabase);

  // Sync tối đa 5 bài viết gần nhất
  const result = await performanceModule.syncFacebookPerformance(5);
  
  console.log('[Debug Sync] Kết quả chạy:');
  console.log(`- Số bài đã thử xử lý: ${result.attempted}`);
  console.log(`- Số bài thành công: ${result.succeeded}`);
  if (result.errors.length > 0) {
    console.log('- Các lỗi gặp phải:');
    result.errors.forEach(err => {
      console.log(`  + Post ID ${err.postId}: ${err.error}`);
    });
  } else {
    console.log('- Không có lỗi xảy ra.');
  }
}

main().catch(console.error);
