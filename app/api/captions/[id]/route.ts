import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { z } from 'zod';

const updateCaptionSchema = z.object({
  edited_content: z.string().min(1, 'edited_content khong duoc rong').optional(),
  status: z.enum(['draft', 'edited', 'approved', 'scheduled', 'posted']).optional(),
  is_favorite_template: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'Can it nhat mot truong de cap nhat',
});

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/captions/[id]
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  const { data, error } = await supabase
    .from('captions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[GET /api/captions/[id]] error:', error);
    return NextResponse.json({ error: 'Không thể tải caption' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Không tìm thấy caption' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

/**
 * PUT /api/captions/[id]
 *
 * T-1.13.3 – Cập nhật caption đã sửa.
 * Cập nhật edited_content và status.
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

  const parsed = updateCaptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: existing, error: fetchError } = await supabase
    .from('captions')
    .select('id, created_by, ai_content, edited_content')
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Không tìm thấy caption' }, { status: 404 });
  }

  if (existing.created_by !== user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Bạn không có quyền sửa caption này' }, { status: 403 });
  }

  const updatePayload = {
    ...parsed.data,
    ...(parsed.data.edited_content !== undefined && { status: parsed.data.status ?? 'edited' }),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('captions')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[PUT /api/captions/[id]] error:', error);
    return NextResponse.json({ error: 'Không thể cập nhật caption' }, { status: 500 });
  }

  if (parsed.data.edited_content !== undefined && parsed.data.edited_content !== existing.edited_content) {
    const { data: latestVersions, error: versionReadError } = await supabase
      .from('caption_versions')
      .select('version_number')
      .eq('caption_id', id)
      .order('version_number', { ascending: false })
      .limit(1);

    if (!versionReadError) {
      const hasVersions = latestVersions && latestVersions.length > 0;
      if (!hasVersions) {
        // Insert original AI content as version 1
        const { error: aiVersionError } = await supabase
          .from('caption_versions')
          .insert({
            caption_id: id,
            version_number: 1,
            content: existing.ai_content,
            source: 'ai',
          });
        if (aiVersionError) {
          console.error('[PUT /api/captions/[id]] AI version insert error:', aiVersionError);
        }

        // Insert edited human content as version 2
        const { error: humanVersionError } = await supabase
          .from('caption_versions')
          .insert({
            caption_id: id,
            version_number: 2,
            content: parsed.data.edited_content,
            source: 'human',
          });
        if (humanVersionError) {
          console.error('[PUT /api/captions/[id]] human version insert error:', humanVersionError);
        }
      } else {
        const nextVersion = ((latestVersions?.[0]?.version_number as number | undefined) ?? 0) + 1;
        const { error: versionInsertError } = await supabase
          .from('caption_versions')
          .insert({
            caption_id: id,
            version_number: nextVersion,
            content: parsed.data.edited_content,
            source: 'human',
          });

        if (versionInsertError) {
          console.error('[PUT /api/captions/[id]] version insert error:', versionInsertError);
        }
      }
    } else {
      console.error('[PUT /api/captions/[id]] version read error:', versionReadError);
    }
  }

  return NextResponse.json({ data });
}
