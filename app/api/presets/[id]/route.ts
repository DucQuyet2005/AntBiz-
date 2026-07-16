import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { formatZodError } from '@/lib/api/zod-error';
import { updatePromptSchema } from '@/lib/validations/prompt';
import { createNotification } from '@/lib/services/notificationService';

// Alias route to existing /api/prompts/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  let query = supabase.from('prompts').select('*').eq('id', id).eq('is_deleted', false);
  if (role !== 'admin' && user) {
    query = query.or(`created_by.eq.${user.id},is_default.eq.true`);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error(`[GET /api/presets/${id}] supabase error:`, error);
    return NextResponse.json({ error: 'Không tìm thấy preset' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    const json = await request.json();
    const parsed = updatePromptSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { name, platform, content, tags, is_default } = parsed.data;

    let query = supabase.from('prompts').select('id, created_by, is_default').eq('id', id).eq('is_deleted', false);
    if (role !== 'admin' && user) {
      query = query.eq('created_by', user.id);
    }
    const { data: existing, error: findErr } = await query.single();

    if (findErr || !existing) {
      return NextResponse.json({ error: 'Preset không tồn tại hoặc không có quyền' }, { status: 403 });
    }

    let finalContent = content;
    if (content) {
      try {
        const parsedContent = JSON.parse(content);
        if (!parsedContent.__preset__) {
          parsedContent.__preset__ = true;
          finalContent = JSON.stringify(parsedContent);
        }
      } catch {}
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (platform !== undefined) updateData.platform = platform;
    if (finalContent !== undefined) updateData.content = finalContent;
    if (tags !== undefined) updateData.tags = tags;
    if (is_default !== undefined && role === 'admin') updateData.is_default = is_default;

    const { data, error } = await supabase
      .from('prompts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[PUT /api/presets/${id}] update error:`, error);
      return NextResponse.json({ error: 'Không thể cập nhật preset' }, { status: 500 });
    }

    if (updateData.name) {
      await createNotification({
        userId: user!.id,
        type: 'info',
        title: 'Cập nhật preset',
        message: `Preset "${updateData.name}" đã được cập nhật`,
        metadata: { link: '/presets' },
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error(`[PUT /api/presets/${id}] Error parsing body:`, err);
    return NextResponse.json({ error: 'Body JSON không hợp lệ' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  let query = supabase.from('prompts').select('id, name, created_by').eq('id', id).eq('is_deleted', false);
  if (role !== 'admin' && user) {
    query = query.eq('created_by', user.id);
  }
  const { data: existing, error: findErr } = await query.single();

  if (findErr || !existing) {
    return NextResponse.json({ error: 'Preset không tồn tại hoặc không có quyền' }, { status: 403 });
  }

  const { error } = await supabase
    .from('prompts')
    .update({ is_deleted: true })
    .eq('id', id);

  if (error) {
    console.error(`[DELETE /api/presets/${id}] error:`, error);
    return NextResponse.json({ error: 'Không thể xóa preset' }, { status: 500 });
  }

  await createNotification({
    userId: user!.id,
    type: 'info',
    title: 'Xóa preset',
    message: `Preset "${existing.name}" đã được xóa`,
  });

  return NextResponse.json({ success: true });
}
