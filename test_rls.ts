import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
const anonSupabase = createClient(supabaseUrl, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function main() {
  const testEmail = 'test_rls_user@example.com';
  const testPassword = 'Password123!';
  const host = 'http://localhost:3000';

  console.log('Cleaning up existing test user if any...');
  const { data: existingAuthUsers } = await adminSupabase.auth.admin.listUsers();
  const existingTestUser = existingAuthUsers?.users.find(u => u.email === testEmail);
  if (existingTestUser) {
    await adminSupabase.auth.admin.deleteUser(existingTestUser.id);
    await adminSupabase.from('users').delete().eq('id', existingTestUser.id);
  }

  console.log('Creating test user in auth...');
  const { data: createdAuth, error: createAuthError } = await adminSupabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true
  });

  if (createAuthError || !createdAuth.user) {
    console.error('Error creating auth user:', createAuthError);
    return;
  }

  const userId = createdAuth.user.id;

  console.log('Creating user profile in users table (role: marketer_full)...');
  await adminSupabase.from('users').insert({
    id: userId,
    email: testEmail,
    role: 'marketer_full',
    status: 'active'
  });

  console.log('Creating a prompt config for this user...');
  await adminSupabase.from('prompt_configs').insert({
    user_id: userId,
    name: 'Test RLS Brand Voice',
    rules: 'Always be polite'
  });

  console.log('Logging in to get access token...');
  const loginRes = await fetch(`${host}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });

  const loginData = (await loginRes.json()) as any;
  if (!loginData.session) {
    console.error('Login failed:', loginData);
    return;
  }

  const token = loginData.session.access_token;
  console.log('Setting session on anonSupabase client...');
  await anonSupabase.auth.setSession({
    access_token: token,
    refresh_token: ''
  });

  console.log('Querying prompt_configs using anonSupabase with user token...');
  const { data, error } = await anonSupabase
    .from('prompt_configs')
    .select('*, users:user_id(id, email)');

  if (error) {
    console.error('Query error:', error);
  } else {
    console.log(`Successfully fetched ${data.length} records:`);
    console.log(data);
  }

  console.log('Cleaning up test user...');
  await adminSupabase.auth.admin.deleteUser(userId);
  await adminSupabase.from('users').delete().eq('id', userId);
}

main().catch(console.error);
