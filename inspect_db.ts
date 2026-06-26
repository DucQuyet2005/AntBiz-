import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const articleId = '9efb817e-8da6-4dcc-9949-395bd882aa99';
  console.log('Querying database for article ID:', articleId);

  // 1. Get article details
  const { data: article, error: artErr } = await supabase
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .single();

  if (artErr) {
    console.error('Error fetching article:', artErr);
  } else {
    console.log('\n=== Article ===');
    console.log('ID:', article.id);
    console.log('Title:', article.title);
    console.log('Category:', article.category);
    console.log('Views:', article.views);
  }

  // 2. Get captions details
  const { data: captions, error: capErr } = await supabase
    .from('captions')
    .select('*')
    .eq('article_id', articleId);

  if (capErr) {
    console.error('Error fetching captions:', capErr);
  } else {
    console.log('\n=== Captions ===');
    captions.forEach(c => {
      console.log({
        id: c.id,
        platform: c.platform,
        status: c.status,
        created_at: c.created_at,
        edited_content: c.edited_content ? c.edited_content.substring(0, 50) + '...' : null,
        ai_content: c.ai_content ? c.ai_content.substring(0, 50) + '...' : null
      });
    });
  }

  // 3. Get scheduled_posts details
  if (captions && captions.length > 0) {
    const captionIds = captions.map(c => c.id);
    const { data: scheduled, error: schedErr } = await supabase
      .from('scheduled_posts')
      .select('*')
      .in('caption_id', captionIds);

    if (schedErr) {
      console.error('Error fetching scheduled posts:', schedErr);
    } else {
      console.log('\n=== Scheduled Posts ===');
      scheduled.forEach(s => {
        console.log({
          id: s.id,
          caption_id: s.caption_id,
          status: s.status,
          scheduled_at: s.scheduled_at,
          posted_at: s.posted_at,
          failed_at: s.failed_at,
          failure_reason: s.failure_reason,
          fb_post_id: s.fb_post_id
        });
      });
    }
  }
}

main();
