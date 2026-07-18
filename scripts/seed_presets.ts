import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const DEFAULT_PRESETS = [
  {
    platform: 'facebook',
    name: 'Mặc định',
    rules: 'Bài viết cung cấp đầy đủ thông tin, có lời dẫn dắt, chia đoạn rõ ràng để dễ đọc. Kết thúc bằng lời kêu gọi hành động (Call to Action) và 3-5 hashtag.',
    is_default: true,
    user_id: null
  },
  {
    platform: 'instagram',
    name: 'Mặc định',
    rules: 'Bài viết ngắn gọn, tập trung chủ yếu vào hình ảnh. Dùng nhiều emoji biểu cảm. Cuối bài phải có 5-10 hashtag liên quan đến chủ đề.',
    is_default: true,
    user_id: null
  },
  {
    platform: 'thread',
    name: 'Mặc định',
    rules: 'Nội dung cực kỳ ngắn gọn (giới hạn dưới 280 ký tự), đi thẳng vào vấn đề chính. Hành văn mang tính trò chuyện, tranh luận mở. Hạn chế dùng quá nhiều hashtag.',
    is_default: true,
    user_id: null
  }
];

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  console.log('Checking presets...');
  const { data: existing, error: checkError } = await supabase.from('platform_presets').select('id');
  if (checkError) {
    console.error('Error checking presets:', checkError);
    return;
  }
  
  if (existing && existing.length > 0) {
    console.log(`Table already has ${existing.length} presets. Skipping seed.`);
    return;
  }
  
  console.log('Seeding presets...');
  const { data: inserted, error: insertError } = await supabase.from('platform_presets').insert(DEFAULT_PRESETS).select();
  if (insertError) {
    console.error('Error inserting presets:', insertError);
  } else {
    console.log('Successfully seeded presets:', inserted);
  }
}

main().catch(console.error);
