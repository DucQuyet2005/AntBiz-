import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole, createServiceRoleClient } from '@/lib/api/auth';

/**
 * GET /api/scheduled-posts/extension-history
 * 
 * Lấy danh sách 10 bài đăng gần nhất (scheduled_posts) được tạo thông qua Extension
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireUserWithRole(request);
    
    // Sử dụng adminSupabase để bypass RLS nếu cần (hoặc dùng client bình thường nếu RLS đã chuẩn)
    const adminSupabase = createServiceRoleClient();

    // Query các scheduled_posts liên kết với captions và articles có category='#Extension'
    const { data, error } = await adminSupabase
      .from('scheduled_posts')
      .select(`
        id,
        platform,
        status,
        scheduled_at,
        posted_at,
        created_at,
        captions!inner (
          id,
          articles!inner (
            id,
            title,
            category
          )
        )
      `)
      .eq('created_by', user.id)
      .eq('captions.articles.category', '#Extension')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[Extension History API] Database query error:', error);
      return NextResponse.json({ error: 'Lỗi khi truy vấn lịch sử' }, { status: 500 });
    }

    // Flatten the data for easier consumption in the frontend
    const history = data.map((item: any) => ({
      id: item.id,
      platform: item.platform,
      status: item.status,
      scheduledAt: item.scheduled_at,
      postedAt: item.posted_at,
      createdAt: item.created_at,
      title: item.captions?.articles?.title || 'Không có tiêu đề',
    }));

    return NextResponse.json({ history });
  } catch (err: any) {
    console.error('[Extension History API] Unauthorized or unknown error:', err);
    return NextResponse.json({ error: err.message || 'Lỗi hệ thống' }, { status: err.status || 500 });
  }
}
