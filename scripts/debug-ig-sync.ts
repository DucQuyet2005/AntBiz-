import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Thiếu cấu hình Supabase!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('--- KIỂM TRA BÀI VIẾT TRONG SCHEDULED_POSTS ---');
  const { data: posts, error: postErr } = await supabase
    .from('scheduled_posts')
    .select('id, platform, status, fb_post_id, created_by, posted_at')
    .eq('platform', 'instagram')
    .order('created_at', { ascending: false })
    .limit(5);

  if (postErr) {
    console.error('Lỗi lấy bài:', postErr);
  } else {
    console.log(posts);
  }

  console.log('\n--- KIỂM TRA LINKED_ACCOUNTS ---');
  const { data: accounts, error: accErr } = await supabase
    .from('linked_accounts')
    .select('id, user_id, platform, account_id')
    .eq('platform', 'instagram');

  if (accErr) {
    console.error('Lỗi lấy account:', accErr);
  } else {
    console.log(accounts);
  }

  console.log('\n--- KIỂM TRA POST_INTERACTIONS ---');
  if (posts && posts.length > 0) {
    const { data: interactions, error: intErr } = await supabase
      .from('post_interactions')
      .select('*')
      .eq('post_id', posts[0].id);
    
    if (intErr) {
      console.error('Lỗi lấy tương tác:', intErr);
    } else {
      console.log(interactions);
    }
  }
}

checkData();
