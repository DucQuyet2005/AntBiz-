import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  const targetUrl = 'https://dantri.com.vn/cong-nghe/67-ten-mien-vn-hai-ky-tu-duoc-dau-gia-tong-gia-tri-hon-15-ty-dong-20260706181142303.htm';
  
  const res = await fetch(`${supabaseUrl}/rest/v1/articles?url=eq.${encodeURIComponent(targetUrl)}&select=id,url,images,body`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  });
  
  const data = await res.json();
  console.log('API Response status:', res.status);
  console.log('Article found:', data.length > 0);
  if (data.length > 0) {
    const art = data[0];
    console.log('Images field:', JSON.stringify(art.images, null, 2));
    console.log('Body field (first few blocks):', JSON.stringify(art.body?.slice(0, 3), null, 2));
  }
}

main().catch(console.error);
