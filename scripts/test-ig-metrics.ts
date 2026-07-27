import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSingleMetrics() {
  const { data: accounts } = await supabase
    .from('linked_accounts')
    .select('access_token, account_id')
    .eq('user_id', 'f85670a7-c6eb-4c1c-b159-7717996691a3')
    .eq('platform', 'instagram')
    .limit(1);

  if (!accounts || !accounts[0]) return;
  const token = accounts[0].access_token;
  const mediaId = '18064142792733993';

  console.log('\n--- TEST LẤY MEDIA TYPE CỦA POST ---');
  const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}?fields=id,media_type,media_product_type,like_count,comments_count&access_token=${token}`);
  const mediaData = await mediaRes.json();
  console.log('Media Info:', mediaData);

  const metricsToTest = ['reach', 'saved', 'shares', 'total_interactions', 'impressions'];

  for (const m of metricsToTest) {
    console.log(`\nTesting metric: ${m}...`);
    const url = `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=${m}&access_token=${token}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.error) {
      console.log(`❌ Lỗi cho metric "${m}":`, json.error.message);
    } else {
      console.log(`✅ Thành công cho metric "${m}":`, JSON.stringify(json.data));
    }
  }
}

testSingleMetrics();
