import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';

type RouteParams = { params: Promise<{ id: string }> };

const MAX_NAME_LENGTH = 200;
const COPY_SUFFIX = ' (Copy)';

// POST /api/prompts/[id]/clone
// Quyết định: bản clone giữ nguyên owner gốc (created_by), chỉ đổi tên + set cloned_from.
// Bất kỳ user authenticated nào cũng clone được (giống quyền tạo Prompt mới — RLS không giới hạn theo role).
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { user, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  const { data: original, error: fetchError } = await supabase
    .from('prompts')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (fetchError) {
    console.error('[POST /api/prompts/[id]/clone] fetch error:', fetchError);
    return NextResponse.json({ error: 'Không thể tải prompt gốc' }, { status: 500 });
  }

  if (!original) {
    return NextResponse.json({ error: 'Không tìm thấy prompt để nhân bản' }, { status: 404 });
  }

  // Spec: Copy of [tên gốc]
  const fullName = `Copy of ${original.name}`;
  const clonedName = fullName.slice(0, MAX_NAME_LENGTH);

  const { data, error } = await supabase
    .from('prompts')
    .insert({
      name: clonedName,
      platform: original.platform,
      content: original.content,
      tags: original.tags,
      created_by: user.id, // Người nhân bản sẽ trở thành owner của prompt mới để có quyền sửa/xóa
      cloned_from: original.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[POST /api/prompts/[id]/clone] insert error:', error);
    return NextResponse.json({ error: 'Không thể nhân bản prompt' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}