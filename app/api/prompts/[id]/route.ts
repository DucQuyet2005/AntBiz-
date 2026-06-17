import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { formatZodError } from '@/lib/api/zod-error';
import { updatePromptSchema } from '@/lib/validations/prompt';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/prompts/[id]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[GET /api/prompts/[id]] supabase error:', error);
    return NextResponse.json({ error: 'Không thể tải prompt' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Không tìm thấy prompt' }, { status: 404 });
  }

  if (data.created_by !== user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Bạn không có quyền xem prompt này' }, { status: 403 });
  }

  return NextResponse.json({ data });
}


/**
 * PUT /api/prompts/[id] — sửa từng phần (name/platform/content/tags)
 * Task spec yêu cầu PUT, UI hiện đang gọi PUT.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 });
  }

  const parsed = updatePromptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dữ liệu không hợp lệ', details: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  // Check tồn tại trước, để phân biệt 404 (không có) và 403 (có nhưng không phải owner/admin)
  const { data: existing, error: fetchError } = await supabase
    .from('prompts')
    .select('id, created_by')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (fetchError) {
    console.error('[PATCH /api/prompts/[id]] fetch error:', fetchError);
    return NextResponse.json({ error: 'Không thể tải prompt' }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Không tìm thấy prompt' }, { status: 404 });
  }

  if (existing.created_by !== user.id && role !== 'admin') {
    return NextResponse.json(
      { error: 'Bạn không có quyền sửa prompt này' },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from('prompts')
    .update(parsed.data)
    .eq('id', id)
    .eq('is_deleted', false)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[PATCH /api/prompts/[id]] update error:', error);
    return NextResponse.json({ error: 'Không thể cập nhật prompt' }, { status: 500 });
  }

  // Row tồn tại (đã check ở trên) nhưng update trả về null => RLS chặn vì không phải owner/admin
  if (!data) {
    return NextResponse.json(
      { error: 'Bạn không có quyền sửa prompt này' },
      { status: 403 }
    );
  }

  return NextResponse.json({ data });
}

// DELETE /api/prompts/[id] — soft delete (set is_deleted = true), KHÔNG xóa cứng
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  const { data: existing, error: fetchError } = await supabase
    .from('prompts')
    .select('id, created_by')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (fetchError) {
    console.error('[DELETE /api/prompts/[id]] fetch error:', fetchError);
    return NextResponse.json({ error: 'Không thể tải prompt' }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Không tìm thấy prompt' }, { status: 404 });
  }

  if (existing.created_by !== user.id && role !== 'admin') {
    return NextResponse.json(
      { error: 'Bạn không có quyền xóa prompt này' },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from('prompts')
    .update({ is_deleted: true })
    .eq('id', id)
    .eq('is_deleted', false)
    .select('id')
    .maybeSingle();

  if (error) {
    // Log đầy đủ message/code/details/hint của Postgres thay vì chỉ log object
    // (object error của supabase-js khi console.log đôi khi hiện rất ít thông tin)
    console.error('[DELETE /api/prompts/[id]] delete error:', {
      message: error.message,
      code: (error as { code?: string }).code,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
    });
    return NextResponse.json(
      { error: `Không thể xóa prompt: ${error.message}` },
      { status: 500 }
    );
  }

  // Câu UPDATE chạy "thành công" (không throw error) nhưng không có row nào khớp.
  // Trường hợp này thường do RLS policy "prompts: owner or admin update" chặn âm thầm
  // (created_by != auth.uid() ở phía Postgres dù check ở app layer phía trên đã pass —
  // ví dụ do session/JWT hết hạn giữa 2 lần gọi, hoặc auth.uid() trả về khác lúc check).
  if (!data) {
    console.error('[DELETE /api/prompts/[id]] update matched 0 rows — likely blocked by RLS', {
      promptId: id,
      userId: user.id,
      role,
    });
    return NextResponse.json(
      {
        error:
          'Không thể xóa prompt: hệ thống phân quyền (RLS) đã chặn thao tác này. Vui lòng đăng nhập lại rồi thử lại.',
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ data: { id, deleted: true } });
}

// PATCH /api/prompts/[id] — alias cho các client cũ
export const PATCH = PUT;