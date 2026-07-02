import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const fromStr = searchParams.get('from');
  const toStr = searchParams.get('to');

  let query = supabase
    .from('scheduled_posts')
    .select('id, platform, status, scheduled_at, captions(id, ai_content, edited_content, articles(id, title))');

  if (fromStr) {
    query = query.gte('scheduled_at', fromStr);
  }
  if (toStr) {
    query = query.lte('scheduled_at', toStr);
  }

  const { data, error } = await query.order('scheduled_at', { ascending: true });
  if (error) {
    console.error('[GET /api/calendar/export/csv] Supabase error:', error);
    return NextResponse.json({ error: 'Không thể tải lịch bài đăng' }, { status: 500 });
  }

  const platformMap: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    thread: 'Threads',
    threads: 'Threads'
  };

  const statusMap: Record<string, string> = {
    pending: 'Chờ đăng',
    posted: 'Đã đăng',
    failed: 'Lỗi',
    cancelled: 'Đã hủy'
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
    // Prepended \u200b (zero-width space) to prevent Excel from parsing this as a Date object
    return `\u200b${hours}:${minutes} ${date}/${month}/${year}`;
  };

  // Compute dynamic title header based on platforms present in the data
  const uniquePlatforms = Array.from(
    new Set((data || []).map(p => p.platform?.toLowerCase()).filter(Boolean))
  );
  let titleHeader = 'LỊCH ĐĂNG BÀI';
  if (uniquePlatforms.length === 1) {
    const plat = uniquePlatforms[0];
    if (plat === 'facebook' || plat === 'fb') {
      titleHeader = 'LỊCH ĐĂNG BÀI FACEBOOK';
    } else if (plat === 'instagram' || plat === 'ig') {
      titleHeader = 'LỊCH ĐĂNG BÀI INSTAGRAM';
    } else if (plat === 'thread' || plat === 'threads') {
      titleHeader = 'LỊCH ĐĂNG BÀI THREADS';
    }
  } else if (uniquePlatforms.length > 1) {
    titleHeader = 'LỊCH ĐĂNG BÀI ĐA NỀN TẢNG';
  }

  const csvHeaders = ['Tiêu đề', 'Kênh đăng', 'Thời gian đăng', 'Trạng thái'];

  const escapeCsv = (val: string) => {
    const clean = val ? String(val).replace(/"/g, '""') : '';
    return `"${clean}"`;
  };

  // Row 1 is the large dynamic title. Row 2 is the actual headers.
  const rows = [
    `"${titleHeader}",,,`,
    csvHeaders.join(',')
  ];

  (data || []).forEach((post: any) => {
    const title = post.captions?.articles?.title || 
                  post.captions?.edited_content || 
                  post.captions?.ai_content || 
                  'AntBiz Campaign';
    const rawPlatform = post.platform?.toLowerCase() || '';
    const platform = platformMap[rawPlatform] || post.platform;
    const rawStatus = post.status?.toLowerCase() || '';
    const status = statusMap[rawStatus] || post.status;
    const formattedDate = formatGmt7Date(post.scheduled_at);

    const row = [
      escapeCsv(title),
      escapeCsv(platform),
      escapeCsv(formattedDate),
      escapeCsv(status)
    ];
    rows.push(row.join(','));
  });

  // UTF-8 BOM helps Microsoft Excel read Vietnamese correctly
  const csvBody = '\ufeff' + rows.join('\r\n');

  return new NextResponse(csvBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="calendar.csv"'
    }
  });
}
