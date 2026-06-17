import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { z } from 'zod';

const updateCaptionSchema = z.object({
  edited_content: z.string().optional(),
  status: z.enum(['draft', 'edited', 'approved', 'scheduled', 'posted']).optional(),
  is_favorite_template: z.boolean().optional(),
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

  // Check ownership
  const { data: existing, error: fetchError } = await supabase
    .from('captions')
    .select('id, created_by')
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Không tìm thấy caption' }, { status: 404 });
  }

  if (existing.created_by !== user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Bạn không có quyền sửa caption này' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('captions')
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[PUT /api/captions/[id]] error:', error);
    return NextResponse.json({ error: 'Không thể cập nhật caption' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
