import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Querying prompt_configs...');
  const { data: configs, error } = await supabase
    .from('prompt_configs')
    .select('*');

  if (error) {
    console.error('Error fetching prompt_configs:', error);
  } else {
    console.log(`Found ${configs.length} records:`);
    configs.forEach(c => {
      console.log({
        id: c.id,
        name: c.name,
        user_id: c.user_id,
        is_default: c.is_default,
        is_system: c.is_system,
        rules: c.rules ? c.rules.substring(0, 50) + '...' : null
      });
    });
  }
}

main();
