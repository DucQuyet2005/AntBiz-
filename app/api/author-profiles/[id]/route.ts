import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Tên văn phong không được để trống').optional(),
  source_url: z.string().url('Link đối thủ không hợp lệ').or(z.string().length(0)).optional(),
  tuned_model_id: z.string().optional(),
  tuning_status: z.string().optional(),
});

/**
 * PUT /api/author-profiles/[id]
 * Cập nhật hồ sơ văn phong tác giả.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, supabase, unauthorized } = await requireUserWithRole([
      'admin',
      'marketer_full',
      'marketer_content',
    ]);
    if (unauthorized) return unauthorized;

    // 1. Kiểm tra quyền sở hữu đối với author profile
    const { data: currentProfile, error: fetchError } = await supabase
      .from('author_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !currentProfile) {
      return NextResponse.json({ error: 'Không tìm thấy văn phong tác giả' }, { status: 404 });
    }

    if (currentProfile.user_id !== user.id && currentProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Bạn không có quyền chỉnh sửa cấu hình này' }, { status: 403 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 });
    }

    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name.trim();
    if (parsed.data.source_url !== undefined) updateData.source_url = parsed.data.source_url.trim() || null;
    if (parsed.data.tuned_model_id !== undefined) updateData.tuned_model_id = parsed.data.tuned_model_id.trim();
    if (parsed.data.tuning_status !== undefined) updateData.tuning_status = parsed.data.tuning_status;

    // Kiểm tra trùng tên nếu có cập nhật tên
    if (updateData.name && updateData.name !== currentProfile.name) {
      const { data: existingProfile, error: checkError } = await supabase
        .from('author_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', updateData.name)
        .neq('id', id)
        .maybeSingle();

      if (checkError) {
        return NextResponse.json({ error: 'Lỗi kiểm tra trùng tên văn phong' }, { status: 500 });
      }

      if (existingProfile) {
        return NextResponse.json(
          { error: `Tên văn phong "${updateData.name}" đã tồn tại. Vui lòng chọn tên khác.` },
          { status: 400 }
        );
      }
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('author_profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[PUT Author Profile Update Error]:', updateError);
      return NextResponse.json({ error: 'Không thể cập nhật văn phong tác giả' }, { status: 500 });
    }

    return NextResponse.json({ data: updatedProfile });
  } catch (error: any) {
    console.error('[PUT Author Profile Unexpected Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

/**
 * DELETE /api/author-profiles/[id]
 * Xóa hồ sơ văn phong tác giả.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, supabase, unauthorized } = await requireUserWithRole([
      'admin',
      'marketer_full',
      'marketer_content',
    ]);
    if (unauthorized) return unauthorized;

    // 1. Kiểm tra quyền sở hữu đối với author profile
    const { data: currentProfile, error: fetchError } = await supabase
      .from('author_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !currentProfile) {
      return NextResponse.json({ error: 'Không tìm thấy văn phong tác giả' }, { status: 404 });
    }

    if (currentProfile.user_id !== user.id && currentProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Bạn không có quyền xóa văn phong này' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('author_profiles')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DELETE Author Profile Error]:', deleteError);
      return NextResponse.json({ error: 'Không thể xóa văn phong tác giả' }, { status: 500 });
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch (error: any) {
    console.error('[DELETE Author Profile Unexpected Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
