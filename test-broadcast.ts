import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; // For client test
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const clientSupa = createClient(supabaseUrl, supabaseKey);
const serverSupa = createClient(supabaseUrl, serviceKey);

async function main() {
  const channelName = `user-status-test-123`;
  
  // 1. Client subscribes
  const channel = clientSupa.channel(channelName);
  channel.on('broadcast', { event: 'status_changed' }, (payload) => {
    console.log('Received broadcast!', payload);
    process.exit(0);
  }).subscribe(async (status) => {
    console.log('Subscription status:', status);
    
    if (status === 'SUBSCRIBED') {
      // 2. Server sends broadcast
      console.log('Server sending broadcast...');
      const serverChannel = serverSupa.channel(channelName);
      
      serverChannel.subscribe(async (serverStatus) => {
         if (serverStatus === 'SUBSCRIBED') {
           const res = await serverChannel.send({
             type: 'broadcast',
             event: 'status_changed',
             payload: { message: 'hello world' }
           });
           console.log('Send result:', res);
         }
      })
    }
  });

  setTimeout(() => {
    console.log('Timeout');
    process.exit(1);
  }, 5000);
}

main();
