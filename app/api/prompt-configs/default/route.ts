import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';

/**
 * GET /api/prompt-configs/default?platform=...
 * Lấy cấu hình mặc định của người dùng hiện tại cho một platform.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await requireUserWithRole([
      'admin',
      'marketer_full',
      'marketer_content',
    ]);
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    if (!platform) {
      return NextResponse.json({ error: 'Thiếu tham số platform' }, { status: 400 });
    }

    // Chuẩn hoá platform 'threads' thành 'thread' để khớp db enum
    const dbPlatform = platform === 'threads' ? 'thread' : platform;

    const { data: config, error } = await supabase
      .from('prompt_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', dbPlatform)
      .eq('is_default', true)
      .maybeSingle();

    if (error) {
      console.error('[GET Default Prompt Config Error]:', error);
      return NextResponse.json({ error: 'Lỗi khi tải cấu hình mặc định' }, { status: 500 });
    }

    return NextResponse.json({ data: config || null });
  } catch (error: any) {
    console.error('[GET Default Prompt Config Unexpected Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
