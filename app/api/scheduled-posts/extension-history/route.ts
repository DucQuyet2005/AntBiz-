import { NextRequest, NextResponse } from 'next/server';
import { requireUser, createServiceRoleClient } from '@/lib/api/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/scheduled-posts/extension-history
 * 
 * Lấy danh sách 10 bài đăng gần nhất (scheduled_posts) được tạo thông qua Extension
 */
export async function GET(request: NextRequest) {
  try {
    const { user, unauthorized } = await requireUser();
    if (unauthorized) return unauthorized;

    const adminSupabase = createServiceRoleClient();

    // 1. Get recent scheduled posts by user
    const { data: scheduledPosts, error: postError } = await adminSupabase
      .from('scheduled_posts')
      .select('id, platform, status, scheduled_at, posted_at, created_at, caption_id, trigger_source')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(50); // Lấy 50 bài gần nhất để lọc

    if (postError) throw postError;
    if (!scheduledPosts || scheduledPosts.length === 0) {
      return NextResponse.json({ history: [] });
    }

    const captionIds = scheduledPosts.map(p => p.caption_id).filter(Boolean);

    // 2. Get captions for these posts
    const { data: captions, error: capError } = await adminSupabase
      .from('captions')
      .select('id, article_id')
      .in('id', captionIds);

    if (capError) throw capError;

    const articleIds = captions.map(c => c.article_id).filter(Boolean);

    // 3. Get articles for these captions
    const { data: articles, error: artError } = await adminSupabase
      .from('articles')
      .select('id, title, category')
      .in('id', articleIds);

    if (artError) throw artError;

    // 4. Filter posts and format
    const history = scheduledPosts
      .filter(post => {
        if (post.trigger_source === 'extension') return true;
        const caption = captions.find(c => c.id === post.caption_id);
        if (!caption) return false;
        const article = articles.find(a => a.id === caption.article_id);
        return article && article.category === '#Extension';
      })
      .slice(0, 10)
      .map(post => {
        const caption = captions.find(c => c.id === post.caption_id);
        const article = caption ? articles.find(a => a.id === caption.article_id) : null;
        return {
          id: post.id,
          platform: post.platform,
          status: post.status,
          scheduledAt: post.scheduled_at,
          postedAt: post.posted_at,
          createdAt: post.created_at,
          title: article ? article.title : 'Không có tiêu đề',
          articleId: article ? article.id : null
        };
      });

    return NextResponse.json({ history });
  } catch (err: any) {
    console.error('[Extension History API] Error:', err);
    return NextResponse.json({ error: err.message || 'Lỗi hệ thống' }, { status: err.status || 500 });
  }
}
