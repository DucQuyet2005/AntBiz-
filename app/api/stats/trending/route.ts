import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  // Generate 7 days in GMT+7
  const nowUtc = new Date();
  const nowGmt7 = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);

  const trendDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(nowGmt7);
    d.setUTCDate(nowGmt7.getUTCDate() - i);
    const pad = (num: number) => String(num).padStart(2, '0');
    const dateStr = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayLabel = dayNames[d.getUTCDay()];

    return {
      date: dateStr,
      dayLabel,
      facebook: 0,
      instagram: 0,
      threads: 0,
      blog: 0
    };
  }).reverse();

  // Query database from the earliest date in trendDays
  const earliestDateStr = trendDays[0].date;
  const earliestDateUtc = new Date(new Date(earliestDateStr + 'T00:00:00Z').getTime() - 7 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('scheduled_posts')
    .select('platform, scheduled_at')
    .gte('scheduled_at', earliestDateUtc)
    .order('scheduled_at', { ascending: true });

  if (role === 'marketer_content' && user) {
    query = query.eq('created_by', user.id);
  }

  const { data: posts, error } = await query;

  if (error) {
    console.error('[GET /api/stats/trending] Supabase error:', error);
    return NextResponse.json({ error: 'Không thể lấy dữ liệu thống kê' }, { status: 500 });
  }

  const getGmt7DateString = (dateStr: string) => {
    const d = new Date(dateStr);
    const gmt7 = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${gmt7.getUTCFullYear()}-${pad(gmt7.getUTCMonth() + 1)}-${pad(gmt7.getUTCDate())}`;
  };

  (posts || []).forEach((post: any) => {
    const dateStr = getGmt7DateString(post.scheduled_at);
    const rawPlatform = post.platform?.toLowerCase();
    const platform = rawPlatform === 'thread' ? 'threads' : rawPlatform || 'blog';

    const matchedDay = trendDays.find(d => d.date === dateStr) as any;
    if (matchedDay && matchedDay[platform] !== undefined) {
      matchedDay[platform]++;
    }
  });

  return NextResponse.json(trendDays);
}
