import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: posts, error } = await supabase
    .from('scheduled_posts')
    .select('platform, status, scheduled_at')
    .gte('scheduled_at', sevenDaysAgo);

  if (error) {
    console.error('[GET /api/stats/summary] Supabase error:', error);
    return NextResponse.json({ error: 'Không thể lấy dữ liệu thống kê' }, { status: 500 });
  }

  let published = 0;
  let pending = 0;
  let failed = 0;
  let cancelled = 0;

  const platformStats: Record<string, { posted: number; failed: number }> = {
    facebook: { posted: 0, failed: 0 },
    instagram: { posted: 0, failed: 0 },
    threads: { posted: 0, failed: 0 },
    blog: { posted: 0, failed: 0 }
  };

  (posts || []).forEach((post: any) => {
    const status = post.status?.toLowerCase();
    const platform = post.platform?.toLowerCase() === 'thread' ? 'threads' : post.platform?.toLowerCase() || 'blog';

    if (status === 'posted') published++;
    else if (status === 'pending') pending++;
    else if (status === 'failed') failed++;
    else if (status === 'cancelled') cancelled++;

    if (platformStats[platform]) {
      if (status === 'posted') platformStats[platform].posted++;
      else if (status === 'failed') platformStats[platform].failed++;
    }
  });

  const successRateByPlatform: Record<string, number> = {};
  Object.keys(platformStats).forEach(platform => {
    const { posted, failed } = platformStats[platform];
    const total = posted + failed;
    successRateByPlatform[platform] = total === 0 ? 100 : Math.round((posted / total) * 100);
  });

  return NextResponse.json({
    total: (posts || []).length,
    published,
    pending,
    failed,
    cancelled,
    successRateByPlatform
  });
}
