import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole, createServiceRoleClient } from '@/lib/api/auth';
import { createPostPerformanceModule } from '@/backend/modules/post-performance/post-performance-factory';

// In-memory cache để chống spam (Cooldown 60s per user)
const syncCooldowns = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    const bypass = isDev && request.headers.get('x-bypass-auth') === 'true';
    let userId = '';

    if (bypass) {
      userId = '00000000-0000-0000-0000-000000000000'; // dummy id for cooldown
    } else {
      const { user, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
      if (unauthorized) return unauthorized;
      userId = user.id;
    }

    // Lấy platform từ query params
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    // Chống spam: Giới hạn mỗi người dùng chỉ được đồng bộ 1 lần mỗi 60 giây
    const now = Date.now();
    const lastSync = syncCooldowns.get(userId) || 0;
    if (now - lastSync < 60_000) {
      return NextResponse.json(
        { error: 'Vui lòng đợi 1 phút trước khi đồng bộ lại.' },
        { status: 429 }
      );
    }
    syncCooldowns.set(userId, now);

    // Khởi tạo Module với Service Role Client để tránh lỗi RLS khi lưu post_interactions
    const serviceRoleSupabase = createServiceRoleClient();
    const postPerformanceModule = createPostPerformanceModule(serviceRoleSupabase);

    console.log(`[API Reports Sync] User ${userId} requested manual sync for platform: ${platform || 'ALL'}`);

    console.time('syncAllPerformance');
    let result: any;
    if (platform && ['facebook', 'instagram', 'threads'].includes(platform)) {
      // Đồng bộ riêng một nền tảng (VD: instagram, facebook, threads) - Truyền force = true để bỏ qua cooldowns
      result = await postPerformanceModule.syncPlatformPerformance(platform as 'facebook' | 'instagram' | 'threads', 50, true);
    } else {
      // Đồng bộ tất cả - Truyền force = true để bỏ qua cooldowns
      result = await postPerformanceModule.syncAllPerformance(50, true);
    }
    console.timeEnd('syncAllPerformance');

    if (result && result.attempted > 0 && result.succeeded === 0 && result.errors?.length > 0) {
      return NextResponse.json(
        { 
          error: `Đồng bộ thất bại (${result.errors[0]?.error || 'Lỗi API'})`, 
          details: result 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Đã đồng bộ thành công ${result?.succeeded || 0}/${result?.attempted || 0} bài viết.`,
      details: result,
    });
  } catch (err: any) {
    console.error('[API Reports Sync] Lỗi khi đồng bộ dữ liệu thủ công:', err);
    return NextResponse.json({ error: err.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
