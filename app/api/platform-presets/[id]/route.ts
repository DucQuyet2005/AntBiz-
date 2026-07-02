import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { z } from 'zod';

const updatePresetSchema = z.object({
  name: z.string().min(1, 'Tên quy chuẩn không được để trống').optional(),
  rules: z.string().min(1, 'Nội dung quy tắc không được để trống').optional(),
  is_default: z.boolean().optional(),
});

/**
 * PUT /api/platform-presets/[id]
 * Cập nhật một quy chuẩn nền tảng của user.
 */
export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await paramsPromise;
    const { user, supabase, unauthorized } = await requireUserWithRole([
      'admin',
      'marketer_full',
      'marketer_content',
    ]);
    if (unauthorized) return unauthorized;

    const body = await request.json();
    const parsed = updatePresetSchema.parse(body);

    // 1. Kiểm tra bản ghi hiện tại
    const { data: currentPreset, error: fetchError } = await supabase
      .from('platform_presets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !currentPreset) {
      return NextResponse.json({ error: 'Không tìm thấy quy chuẩn' }, { status: 404 });
    }

    // Không được sửa quy chuẩn hệ thống (user_id IS NULL)
    if (!currentPreset.user_id) {
      return NextResponse.json({ error: 'Không thể chỉnh sửa quy chuẩn gốc của hệ thống' }, { status: 403 });
    }

    // Kiểm tra quyền sở hữu
    if (currentPreset.user_id !== user.id) {
      return NextResponse.json({ error: 'Bạn không có quyền chỉnh sửa quy chuẩn này' }, { status: 403 });
    }

    // 2. Nếu chuyển thành mặc định, reset các bản ghi khác cùng platform của user này
    if (parsed.is_default) {
      await supabase
        .from('platform_presets')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('platform', currentPreset.platform);
    }

    // 3. Thực hiện update
    const { data: updatedPreset, error: updateError } = await supabase
      .from('platform_presets')
      .update({
        ...(parsed.name && { name: parsed.name }),
        ...(parsed.rules && { rules: parsed.rules }),
        ...(parsed.is_default !== undefined && { is_default: parsed.is_default }),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[PUT Platform Preset Error]:', updateError);
      return NextResponse.json({ error: 'Không thể cập nhật quy chuẩn' }, { status: 500 });
    }

    return NextResponse.json({ data: updatedPreset });
  } catch (error: any) {
    console.error('[PUT Platform Preset Unexpected Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

/**
 * DELETE /api/platform-presets/[id]
 * Xóa quy chuẩn nền tảng cá nhân.
 */
export async function DELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await paramsPromise;
    const { user, supabase, unauthorized } = await requireUserWithRole([
      'admin',
      'marketer_full',
      'marketer_content',
    ]);
    if (unauthorized) return unauthorized;

    // 1. Kiểm tra bản ghi
    const { data: preset, error: fetchError } = await supabase
      .from('platform_presets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !preset) {
      return NextResponse.json({ error: 'Không tìm thấy quy chuẩn' }, { status: 404 });
    }

    // Không được xóa quy chuẩn gốc hệ thống
    if (!preset.user_id) {
      return NextResponse.json({ error: 'Không thể xóa quy chuẩn gốc của hệ thống' }, { status: 403 });
    }

    // Kiểm tra quyền sở hữu
    if (preset.user_id !== user.id) {
      return NextResponse.json({ error: 'Bạn không có quyền xóa quy chuẩn này' }, { status: 403 });
    }

    // 2. Thực hiện xóa
    const { error: deleteError } = await supabase
      .from('platform_presets')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DELETE Platform Preset Error]:', deleteError);
      return NextResponse.json({ error: 'Không thể xóa quy chuẩn' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE Platform Preset Unexpected Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
