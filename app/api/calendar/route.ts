import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const fromStr = searchParams.get('from');
  const toStr = searchParams.get('to');
  const platformsStr = searchParams.get('platforms');
  const platformsArray = searchParams.getAll('platforms[]');

  let query = supabase
    .from('scheduled_posts')
    .select('*, captions(id, ai_content, edited_content, platform, articles(id, title, category, description))');

  if (fromStr) {
    query = query.gte('scheduled_at', fromStr);
  }
  if (toStr) {
    query = query.lte('scheduled_at', toStr);
  }

  let platforms: string[] = [];
  if (platformsStr) {
    platforms = platformsStr.split(',').map(p => p.trim().toLowerCase());
  } else if (platformsArray && platformsArray.length > 0) {
    platforms = platformsArray.map(p => p.trim().toLowerCase());
  }

  const normalizePlatform = (p: string) => {
    if (p === 'fb') return 'facebook';
    if (p === 'ig') return 'instagram';
    return p;
  };

  if (platforms.length > 0) {
    const dbPlatforms = platforms.map(normalizePlatform).map(p => p === 'threads' ? 'thread' : p);
    query = query.in('platform', dbPlatforms);
  }

  query = query.order('scheduled_at', { ascending: true });

  const { data, error } = await query;
  if (error) {
    console.error('[GET /api/calendar] Supabase error:', error);
    return NextResponse.json({ error: 'Không thể tải lịch bài đăng' }, { status: 500 });
  }

  // Group posts by scheduled time
  const groups: Record<string, any[]> = {};
  (data || []).forEach((post: any) => {
    const timeKey = post.scheduled_at;
    if (!groups[timeKey]) {
      groups[timeKey] = [];
    }
    groups[timeKey].push(post);
  });

  const events = Object.entries(groups).map(([timeKey, groupPosts]) => {
    if (groupPosts.length === 1) {
      const post = groupPosts[0];
      const title = post.captions?.articles?.title || 
                    post.captions?.edited_content || 
                    post.captions?.ai_content || 
                    'Bài viết không tên';
      const platform = post.platform === 'thread' ? 'threads' : post.platform;

      return {
        id: post.id,
        title,
        start: post.scheduled_at,
        end: new Date(new Date(post.scheduled_at).getTime() + 10 * 60000).toISOString(),
        editable: post.status === 'pending',
        startEditable: post.status === 'pending',
        durationEditable: false,
        classNames: (post.status === 'cancelled' || post.status === 'failed') ? ['opacity-40'] : [],
        extendedProps: {
          platform,
          status: post.status,
          captionId: post.caption_id,
          imageUrls: post.image_urls,
          post,
          isMultiple: false
        }
      };
    } else {
      // Multiple overlapping posts at the same minute
      const uniquePlatforms = Array.from(new Set(groupPosts.map(p => p.platform === 'thread' ? 'threads' : p.platform)));
      const allPending = groupPosts.every(p => p.status === 'pending');
      const allDimmed = groupPosts.every(p => p.status === 'cancelled' || p.status === 'failed');

      return {
        id: `multiple-${timeKey}`,
        title: `${groupPosts.length} bài đăng`,
        start: timeKey,
        end: new Date(new Date(timeKey).getTime() + 10 * 60000).toISOString(),
        editable: allPending,
        startEditable: allPending,
        durationEditable: false,
        classNames: allDimmed ? ['opacity-40'] : [],
        extendedProps: {
          platform: 'multiple',
          platforms: uniquePlatforms,
          posts: groupPosts,
          isMultiple: true
        }
      };
    }
  });

  return NextResponse.json({ data: events });
}
