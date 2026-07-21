import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // 1. Get an admin user
  const { data: users, error: userErr } = await supabase.from('users').select('*').limit(1);
  if (userErr || !users?.length) {
    console.error('Failed to get user');
    return;
  }
  const userId = users[0].id;

  // 2. Create some dummy articles and captions to attach to scheduled posts
  const platforms = ['facebook', 'instagram', 'thread'];
  const statuses = ['pending', 'posted', 'failed', 'cancelled'];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  console.log('Seeding scheduled posts...');

  for (let i = 0; i < 25; i++) {
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // Create an article
    const { data: article } = await supabase.from('articles').insert({
      title: `Bài viết mẫu kiểm thử số ${i + 1}`,
      content: 'Nội dung bài viết mẫu...',
      source_url: 'https://example.com'
    }).select().single();

    if (!article) continue;

    // Create a caption
    const { data: caption } = await supabase.from('captions').insert({
      article_id: article.id,
      created_by: userId,
      platform,
      ai_content: `Nội dung AI sinh ra cho bài viết số ${i + 1}`,
      status: 'approved'
    }).select().single();

    if (!caption) continue;

    // Generate a random schedule time between today and +5 days
    // Force some posts to overlap (same hour)
    const offsetDays = Math.floor(Math.random() * 5);
    const scheduledDate = new Date(today);
    scheduledDate.setDate(scheduledDate.getDate() + offsetDays);
    
    // For overlaps, use fixed hours: 09:00, 15:00, 20:00
    const fixedHours = [9, 15, 20];
    const hr = fixedHours[Math.floor(Math.random() * fixedHours.length)];
    scheduledDate.setHours(hr, 0, 0, 0);

    await supabase.from('scheduled_posts').insert({
      caption_id: caption.id,
      created_by: userId,
      platform,
      status,
      scheduled_at: scheduledDate.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  console.log('Seeding complete! 25 posts created.');
}

main().catch(console.error);
