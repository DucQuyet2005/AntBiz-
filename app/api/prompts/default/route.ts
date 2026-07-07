import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';

/**
 * GET /api/prompts/default?platform=threads
 * Trả về prompt được đánh dấu mặc định cho một nền tảng cụ thể.
 */
export async function GET(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const searchParams = request.nextUrl.searchParams;
  let platform = searchParams.get('platform');

  if (!platform) {
    return NextResponse.json({ error: 'Thiếu platform cần lấy default prompt' }, { status: 400 });
  }

  // Chuẩn hóa platform sang 'thread'
  const targetPlatform = platform === 'threads' ? 'thread' : platform;

  // 1. Tìm prompt được đánh dấu is_default = true
  const { data: defaultPrompt, error: defaultError } = await supabase
    .from('prompts')
    .select('*')
    .eq('created_by', user.id)
    .eq('platform', targetPlatform)
    .eq('is_default', true)
    .eq('is_deleted', false)
    .maybeSingle();

  if (defaultError) {
    console.error('[GET /api/prompts/default] Error fetching default prompt:', defaultError);
    return NextResponse.json({ error: 'Lỗi tải prompt mặc định' }, { status: 500 });
  }

  if (defaultPrompt) {
    return NextResponse.json({ data: defaultPrompt });
  }

  // 2. Fallback: Nếu không tìm thấy prompt nào là mặc định, lấy prompt đầu tiên của platform đó
  const { data: fallbackPrompt, error: fallbackError } = await supabase
    .from('prompts')
    .select('*')
    .eq('created_by', user.id)
    .eq('platform', targetPlatform)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallbackError) {
    console.error('[GET /api/prompts/default] Error fetching fallback prompt:', fallbackError);
    return NextResponse.json({ error: 'Lỗi tải prompt dự phòng' }, { status: 500 });
  }

  if (fallbackPrompt) {
    return NextResponse.json({ data: fallbackPrompt });
  }

  // 3. Nếu không có prompt nào của user đó, trả về null hoặc không tìm thấy
  return NextResponse.json({ data: null });
}
