const { createClient } = require('c:/Users/ADMIN/Desktop/AntBiz/AntBiz-/node_modules/@supabase/supabase-js');
const dotenv = require('c:/Users/ADMIN/Desktop/AntBiz/AntBiz-/node_modules/dotenv');
const path = require('path');

dotenv.config({ path: 'c:/Users/ADMIN/Desktop/AntBiz/AntBiz-/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Env variables. URL:', supabaseUrl, 'Key present:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: userRow, error: userError } = await supabase.from('users').select('*').limit(1);
  console.log('--- USER ROW ---');
  console.log(userRow);
  if (userError) console.error(userError);
}

run();
