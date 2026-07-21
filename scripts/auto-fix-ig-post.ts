import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function autoFix() {
  console.log('--- ĐANG CHẠY AUTO FIX INSTAGRAM POST ID ---');
  
  // 1. Lấy Access Token của tài khoản Instagram
  const { data: accounts, error: accErr } = await supabase
    .from('linked_accounts')
    .select('access_token, account_id')
    .eq('user_id', 'f85670a7-c6eb-4c1c-b159-7717996691a3')
    .eq('platform', 'instagram')
    .limit(1);

  if (accErr || !accounts || accounts.length === 0) {
    console.error('Không tìm thấy token. Vui lòng gửi Link bài viết thủ công.');
    return;
  }

  const { access_token, account_id } = accounts[0];

  // 2. Gọi Graph API để lấy Media ID bài viết mới nhất
  try {
    const url = `https://graph.facebook.com/v19.0/${account_id}/media?access_token=${access_token}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (data && data.data && data.data.length > 0) {
      const latestMediaId = data.data[0].id;
      console.log(`✅ Tìm thấy IG Media ID mới nhất: ${latestMediaId}`);

      // 3. Cập nhật vào scheduled_posts
      const postId = '0a0f4e05-72f2-4499-830f-ae3ac3de3cd0';
      const { error: updateErr } = await supabase
        .from('scheduled_posts')
        .update({ fb_post_id: latestMediaId })
        .eq('id', postId);

      if (updateErr) {
        console.error('Lỗi cập nhật DB:', updateErr);
      } else {
        console.log(`🎉 Đã update thành công bài viết [${postId}] với IG ID [${latestMediaId}]!`);
        console.log('Bạn đã có thể ấn nút ĐỒNG BỘ trên UI!');
      }
    } else {
      console.error('Tài khoản IG này chưa có bài viết nào hoặc Graph API báo lỗi:', data);
    }
  } catch (err) {
    console.error('Lỗi gọi Graph API:', err);
  }
}

autoFix();
