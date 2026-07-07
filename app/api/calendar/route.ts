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

  // Group posts by local hour in UTC+7 (Asia/Ho_Chi_Minh)
  const groups: Record<string, any[]> = {};
  (data || []).forEach((post: any) => {
    const date = new Date(post.scheduled_at);
    // Convert to local hour in UTC+7
    const localTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const yyyy = localTime.getUTCFullYear();
    const mm = String(localTime.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(localTime.getUTCDate()).padStart(2, '0');
    const hh = String(localTime.getUTCHours()).padStart(2, '0');
    const timeKey = `${yyyy}-${mm}-${dd}T${hh}:00:00+07:00`;

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
        end: new Date(new Date(post.scheduled_at).getTime() + 30 * 60000).toISOString(), // display with default 30 min height
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
      // Multiple overlapping posts in the same local hour
      const uniquePlatforms = Array.from(new Set(groupPosts.map(p => p.platform === 'thread' ? 'threads' : p.platform)));
      const hasPending = groupPosts.some(p => p.status === 'pending');
      const allDimmed = groupPosts.every(p => p.status === 'cancelled' || p.status === 'failed');

      return {
        id: `multiple-${timeKey}`,
        title: `${groupPosts.length} bài đăng`,
        start: timeKey,
        end: new Date(new Date(timeKey).getTime() + 60 * 60000).toISOString(), // Spans 1 hour visually
        editable: hasPending,
        startEditable: hasPending,
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
