import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole, createServiceRoleClient, getCalendarToken } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const userId = searchParams.get('userId');

  let supabaseClient: any;
  let bypassAuth = false;

  if (userId && token) {
    const expectedToken = getCalendarToken(userId);
    if (token === expectedToken) {
      bypassAuth = true;
      supabaseClient = createServiceRoleClient();
    }
  }

  if (!bypassAuth) {
    const { user, role, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
    if (unauthorized) return unauthorized;
    supabaseClient = supabase;
  }

  const fromStr = searchParams.get('from');
  const toStr = searchParams.get('to');

  let query = supabaseClient
    .from('scheduled_posts')
    .select('id, platform, status, scheduled_at, created_at, captions(id, ai_content, edited_content, articles(id, title))');

  if (bypassAuth && userId) {
    query = query.eq('created_by', userId);
  }

  if (fromStr) {
    query = query.gte('scheduled_at', fromStr);
  }
  if (toStr) {
    query = query.lte('scheduled_at', toStr);
  }

  const { data, error } = await query.order('scheduled_at', { ascending: true });
  if (error) {
    console.error('[GET /api/calendar/export/ical] Supabase error:', error);
    return NextResponse.json({ error: 'Không thể tải lịch bài đăng' }, { status: 500 });
  }

  const toIcalDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };

  const escapeText = (str: string) => {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AntBiz//Editorial Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  const platformMap: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    thread: 'Threads',
    threads: 'Threads'
  };

  const statusMap: Record<string, string> = {
    pending: 'Chờ đăng (Scheduled)',
    posted: 'Đã đăng (Posted)',
    failed: 'Lỗi (Failed)',
    cancelled: 'Đã hủy (Cancelled)'
  };

  const formatGmt7Date = (dateStr: string) => {
    const d = new Date(dateStr);
    const gmt7 = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    const pad = (num: number) => String(num).padStart(2, '0');
    const date = pad(gmt7.getUTCDate());
    const month = pad(gmt7.getUTCMonth() + 1);
    const year = gmt7.getUTCFullYear();
    const hours = pad(gmt7.getUTCHours());
    const minutes = pad(gmt7.getUTCMinutes());
    return `${hours}:${minutes} ${date}/${month}/${year}`;
  };

  (data || []).forEach((post: any) => {
    const title = post.captions?.articles?.title || 
                  post.captions?.edited_content || 
                  post.captions?.ai_content || 
                  'AntBiz Campaign';
    
    const rawPlatform = post.platform?.toLowerCase() || '';
    const platformName = platformMap[rawPlatform] || post.platform;
    const rawStatus = post.status?.toLowerCase() || '';
    const statusName = statusMap[rawStatus] || post.status;
    const readableTime = formatGmt7Date(post.scheduled_at);
    
    const captionPreview = post.captions?.edited_content || post.captions?.ai_content || '';
    const truncatedPreview = captionPreview.length > 150 ? captionPreview.slice(0, 150) + '...' : captionPreview;

    const startStr = post.scheduled_at;
    const endStr = new Date(new Date(startStr).getTime() + 10 * 60 * 1000).toISOString(); // 10 mins slot duration
    const dtstart = toIcalDate(startStr);
    const dtend = toIcalDate(endStr);
    const dtstamp = toIcalDate(post.created_at || new Date().toISOString());
    const uid = `${post.id}@antbiz.com`;

    const summary = `[${platformName}] ${title}`;
    const description = `Kênh đăng: ${platformName}\nTrạng thái: ${statusName}\nThời gian: ${readableTime} (GMT+7)\n\n---\nNội dung:\n${truncatedPreview}`;

    ics.push('BEGIN:VEVENT');
    ics.push(`UID:${uid}`);
    ics.push(`DTSTAMP:${dtstamp}`);
    ics.push(`DTSTART:${dtstart}`);
    ics.push(`DTEND:${dtend}`);
    ics.push(`SUMMARY:${escapeText(summary)}`);
    ics.push(`DESCRIPTION:${escapeText(description)}`);
    ics.push('END:VEVENT');
  });

  ics.push('END:VCALENDAR');
  const icsBody = ics.join('\r\n');

  return new NextResponse(icsBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="calendar.ics"'
    }
  });
}
