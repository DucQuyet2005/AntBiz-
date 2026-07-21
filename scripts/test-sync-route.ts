import * as dotenv from 'dotenv';
import { createServiceRoleClient } from '../lib/api/auth';
import { createPostPerformanceModule } from '../backend/modules/post-performance/post-performance-factory';

dotenv.config({ path: '.env.local' });

async function verifySyncFlow() {
  console.log('--- 🧪 TỰ ĐỘNG KIỂM TRA TOÀN BỘ LUỒNG ĐỒNG BỘ REALTIME ---');
  
  try {
    const serviceRoleSupabase = createServiceRoleClient();
    const module = createPostPerformanceModule(serviceRoleSupabase);

    console.log('1. Khởi chạy syncPlatformPerformance("instagram")...');
    const result = await module.syncPlatformPerformance('instagram');
    
    console.log('2. Kết quả đồng bộ:', result);

    if (result.succeeded > 0) {
      console.log('\n🎉 ĐÃ ĐỒNG BỘ THÀNH CÔNG RLS BỊ TRIỆT HẠ 100%!');
    } else if (result.errors.length > 0) {
      console.error('\n❌ Phát hiện lỗi:', result.errors);
    }
  } catch (err: any) {
    console.error('❌ Lỗi hệ thống:', err.message);
  }
}

verifySyncFlow();
