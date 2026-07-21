import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificPost() {
  const { data: interactions } = await supabase
    .from('post_interactions')
    .select('*')
    .eq('post_id', '0a0f4e05-72f2-4499-830f-ae3ac3de3cd0');

  console.log('🎉 DỮ LIỆU TƯƠNG TÁC THỰC TẾ TRONG POST_INTERACTIONS:');
  console.log(interactions);
}

checkSpecificPost();
