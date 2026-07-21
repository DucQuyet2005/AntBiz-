import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { InstagramPerformanceCollector } from '../backend/modules/post-performance/instagram-performance-collector';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugIgGraphApi() {
  console.log('\n--- 🐛 BẮT ĐẦU TEST LẤY DỮ LIỆU INSTAGRAM ---');
  
  // 1. Lấy thông tin bài viết và Token
  const { data: accounts } = await supabase
    .from('linked_accounts')
    .select('access_token, account_id')
    .eq('user_id', 'f85670a7-c6eb-4c1c-b159-7717996691a3')
    .eq('platform', 'instagram')
    .limit(1);

  if (!accounts || accounts.length === 0) {
    console.error('Không tìm thấy Access Token!');
    return;
  }
  const token = accounts[0].access_token;
  const mediaId = '18064142792733993'; // ID chúng ta vừa update

  console.log(`🔑 Đang dùng Token: ${token.substring(0, 15)}...`);
  console.log(`📌 Đang gọi API cho Media ID: ${mediaId}`);

  // 2. Thử gọi API bằng InstagramPerformanceCollector
  const collector = new InstagramPerformanceCollector(fetch as any);
  
  try {
    const metrics = await collector.fetchPostMetrics(mediaId, token);
    console.log('✅ KẾT QUẢ TỪ GRAPH API INSTAGRAM:', metrics);
    
    // Lưu vào DB
    const { error: upsertErr } = await supabase
      .from('post_interactions')
      .upsert({
        post_id: '0a0f4e05-72f2-4499-830f-ae3ac3de3cd0',
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        clicks: metrics.clicks,
        reach: metrics.reach,
        impressions: metrics.impressions,
        updated_at: new Date().toISOString()
      }, { onConflict: 'post_id' });
      
    if (upsertErr) {
      console.error('Lỗi lưu vào DB:', upsertErr);
    } else {
      console.log('✅ Đã lưu kết quả tương tác vào Database thành công!');
    }
  } catch (err) {
    console.error('❌ LỖI KHI GỌI GRAPH API:', err);
  }
  console.log('-------------------------------------------\n');
}

debugIgGraphApi();
