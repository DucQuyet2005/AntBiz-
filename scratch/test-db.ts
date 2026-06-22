import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function test() {
  console.log("Testing database schema...");
  const { data, error } = await supabase
    .from('caption_versions')
    .insert({
      version_number: 9999,
      content: 'test-content',
      source: 'ai'
    })
    .select();
  
  if (error) {
    console.error("Insert error:", error);
  } else {
    console.log("Insert success:", data);
    // Cleanup
    await supabase.from('caption_versions').delete().eq('version_number', 9999);
  }
}

test();
