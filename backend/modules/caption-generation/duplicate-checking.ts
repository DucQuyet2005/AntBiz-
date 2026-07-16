import { SupabaseClient } from '@supabase/supabase-js';
import { findMostSimilarPost } from './similarity';

export async function checkDuplicateCaption(
  supabase: SupabaseClient,
  userId: string,
  text: string,
  threshold: number = 0.75
) {
  if (!text) {
    throw new Error('Missing text parameter');
  }

  // Lấy 100 bài đăng gần nhất của user
  const { data: recentPosts, error } = await supabase
    .from('scheduled_posts')
    .select('id, captions(ai_content, edited_content)')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[Duplicate Checking] Error fetching posts:', error);
    throw new Error('Failed to fetch recent posts');
  }

  if (!recentPosts || recentPosts.length === 0) {
    return {
      isDuplicate: false,
      maxSimilarity: 0,
      similarPostId: null,
      message: 'No recent posts found to compare.'
    };
  }

  const formattedPosts = recentPosts.map((post: any) => ({
    id: post.id,
    content: post.captions?.edited_content || post.captions?.ai_content || ''
  }));

  // Áp dụng thuật toán so sánh
  const result = findMostSimilarPost(text, formattedPosts, threshold);

  return result;
}
