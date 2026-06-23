import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  console.log("Fetching scheduled posts...");
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*, captions(id, ai_content, edited_content)')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error("Error fetching scheduled posts:", error);
  } else {
    console.log(`Found ${data.length} scheduled posts.`);
    data.forEach(post => {
      console.log(`- ID: ${post.id}`);
      console.log(`  Platform: ${post.platform}`);
      console.log(`  Status: ${post.status}`);
      console.log(`  Scheduled At: ${post.scheduled_at}`);
      console.log(`  Posted At: ${post.posted_at}`);
      console.log(`  Failed At: ${post.failed_at}`);
      console.log(`  Failure Reason: ${post.failure_reason}`);
      console.log(`  Created At: ${post.created_at}`);
      console.log(`  Caption Preview: ${post.captions?.edited_content?.substring(0, 50) || post.captions?.ai_content?.substring(0, 50) || 'None'}`);
      console.log('----------------------------------------------------');
    });
  }
}

check();
