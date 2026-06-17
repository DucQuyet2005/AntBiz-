import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/prompts/[id]/check-usage
 *
 * Kiểm tra xem prompt có đang được tham chiếu bởi caption nào không,
 * trước khi cho phép xóa.
 *
 * Hiện tại bảng captions chưa tồn tại → trả về in_use: false.
 * Khi bảng captions được tạo, chỉ cần uncomment phần query bên dưới.
 *
 * Response:
 *   200 { in_use: boolean, count: number }
 *   404 nếu prompt không tồn tại hoặc đã bị xóa
 *   401 nếu chưa đăng nhập
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  // Kiểm tra prompt tồn tại
  const { data: prompt, error: promptError } = await supabase
    .from('prompts')
    .select('id')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (promptError) {
    console.error('[GET /api/prompts/[id]/check-usage] fetch error:', promptError);
    return NextResponse.json({ error: 'Không thể kiểm tra prompt' }, { status: 500 });
  }
  if (!prompt) {
    return NextResponse.json({ error: 'Không tìm thấy prompt' }, { status: 404 });
  }

  // “Đang được dùng trong post đã lên lịch”:
  // scheduled_posts.status thuộc pending/posted
  // prompt dùng thông qua captions.prompt_id -> scheduled_posts.caption_id
  const { data: captionIds, error: captionIdsError } = await supabase
    .from('captions')
    .select('id')
    .eq('prompt_id', id);

  if (captionIdsError) {
    console.error('[check-usage] captionIdsError:', captionIdsError);
    return NextResponse.json({ error: 'Không thể kiểm tra' }, { status: 500 });
  }

  const captionIdSet = new Set((captionIds ?? []).map((c) => c.id));

  const { data: scheduled, error: scheduledError } = await supabase
    .from('scheduled_posts')
    .select('caption_id')
    .in('status', ['pending', 'posted']);

  if (scheduledError) {
    console.error('[check-usage] scheduledError:', scheduledError);
    return NextResponse.json({ error: 'Không thể kiểm tra' }, { status: 500 });
  }

  const usedCaptionCount = (scheduled ?? []).reduce((acc, row) => {
    if (row.caption_id && captionIdSet.has(row.caption_id)) return acc + 1;
    return acc;
  }, 0);

  return NextResponse.json({
    in_use: usedCaptionCount > 0,
    count: usedCaptionCount,
  });
}
