import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api/auth';
import { createNotification, NotificationType } from '@/lib/services/notificationService';

// Từ khóa nhận diện theo từng danh mục (mirror với client-side classifyNotification)
const PROMPT_KEYWORDS = ['prompt'];
const LICH_KEYWORDS = ['lịch', 'lich', 'schedule', 'scheduled', 'đăng bài', 'lên lịch', 'dời lịch', 'hủy lịch', 'thay đổi lịch'];

/**
 * Xây dựng filter OR cho Supabase theo từ khóa trong title hoặc message.
 * Supabase PostgREST syntax: "title.ilike.%keyword%,message.ilike.%keyword%"
 */
function buildKeywordOrFilter(keywords: string[]): string {
  return keywords
    .flatMap(kw => [
      `title.ilike.%${kw}%`,
      `message.ilike.%${kw}%`,
    ])
    .join(',');
}

// GET /api/notifications - Lấy danh sách thông báo của user hiện tại
export async function GET(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    // Nhận param 'category' mới; fallback về 'type' cũ để tương thích ngược
    const category = url.searchParams.get('category') || url.searchParams.get('type') || 'all';

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Lấy role user để xác định quyền truy cập
    const { data: roleData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    const userRole = roleData?.role || 'marketer';

    // Base query
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Admin chỉ thấy type = 'info'
    if (userRole === 'admin') {
      query = query.eq('type', 'info');
    }

    // Áp dụng filter theo category
    switch (category) {
      case 'bai-dang':
        if (userRole === 'admin') {
          // Admin không có bài đăng — trả về rỗng
          return NextResponse.json({ data: [], count: 0, page, limit, totalPages: 0 });
        }
        query = (query as any).in('type', ['post_success', 'post_failed']);
        break;

      case 'prompt': {
        // type = 'info' (đã áp với admin) + title/message chứa "prompt"
        const promptFilter = buildKeywordOrFilter(PROMPT_KEYWORDS);
        query = query.eq('type', 'info').or(promptFilter);
        break;
      }

      case 'lich': {
        if (userRole === 'admin') {
          // Admin: chỉ info với từ khóa lịch
          const lichFilter = buildKeywordOrFilter(LICH_KEYWORDS);
          query = query.eq('type', 'info').or(lichFilter);
        } else {
          // Marketer: ab_test_complete + info với từ khóa lịch
          const lichKeywordFilter = buildKeywordOrFilter(LICH_KEYWORDS);
          query = (query as any).or(
            `type.eq.ab_test_complete,and(type.eq.info,or(${lichKeywordFilter}))`
          );
        }
        break;
      }

      case 'he-thong': {
        // type = 'info' KHÔNG chứa từ khóa prompt hay lịch
        const allExcludeKeywords = [...PROMPT_KEYWORDS, ...LICH_KEYWORDS];
        let heThongQuery = query.eq('type', 'info');
        for (const kw of allExcludeKeywords) {
          heThongQuery = (heThongQuery as any)
            .not('title', 'ilike', `%${kw}%`)
            .not('message', 'ilike', `%${kw}%`);
        }
        query = heThongQuery;
        break;
      }

      // 'all' hoặc không nhận diện được — không thêm filter
      default:
        break;
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error('[GET /api/notifications] Supabase error:', error);
      return NextResponse.json({ error: 'Không thể tải danh sách thông báo' }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      count: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err: any) {
    console.error('[GET /api/notifications] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


// POST /api/notifications - Tạo thông báo mới (internal hoặc authorized)
export async function POST(request: NextRequest) {
  // Kiểm tra Service Role token cho các cuộc gọi hệ thống ngầm
  const authHeader = request.headers.get('authorization');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isServiceRole = serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;

  let currentUser: any = null;
  if (!isServiceRole) {
    const { user, unauthorized } = await requireUser();
    if (unauthorized) return unauthorized;
    currentUser = user;
  }

  try {
    const body = await request.json();
    const { userId, type, title, message, metadata } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json({ error: 'Thiếu các trường bắt buộc (userId, type, title, message)' }, { status: 400 });
    }

    // Bảo mật: Nếu không phải service_role, user chỉ được tạo thông báo cho chính mình
    if (!isServiceRole && currentUser && userId !== currentUser.id) {
      // Cho phép admin tạo cho người khác, check role admin
      const { data: profile } = await createNotification({
        userId: currentUser.id,
        type: 'info',
        title: 'Bảo mật',
        message: 'Kiểm tra quyền hạn',
      }).then(() => ({ data: { role: 'marketer' } })); // fallback if not exist
      
      const supabase = require('@/utils/supabase/server').createClient();
      const { data: dbUser } = await supabase.from('users').select('role').eq('id', currentUser.id).single();
      if (!dbUser || dbUser.role !== 'admin') {
        return NextResponse.json({ error: 'Bạn không có quyền tạo thông báo cho người dùng khác' }, { status: 403 });
      }
    }

    const newNotification = await createNotification({
      userId,
      type: type as NotificationType,
      title,
      message,
      metadata,
    });

    return NextResponse.json({ success: true, data: newNotification }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/notifications] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
