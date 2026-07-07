require('dotenv').config();

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environmental variables.');
    return;
  }

  const url = `${supabaseUrl}/rest/v1/scheduled_posts?select=id,platform,status,scheduled_at,fb_post_id,threads_post_id,created_at,captions(id,platform,ai_content)&created_at=gt.2026-07-04T00:00:00Z`;
  const headers = {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  };

  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    console.log('Posts after July 4th:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
