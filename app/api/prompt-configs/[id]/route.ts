import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { z } from 'zod';

const updateConfigSchema = z.object({
  name: z.string().min(1, 'Tên cấu hình không được để trống').optional(),
  platform: z.enum(['facebook', 'thread', 'instagram', 'all']).optional(),
  rules: z.string().optional(),
  params: z.object({
    variant_count: z.number().optional(),
  }).optional(),
  is_default: z.boolean().optional(),
});

/**
 * PUT /api/prompt-configs/[id]
 * Cập nhật cấu hình prompt.
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

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 });
    }

    const parsed = updateConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    // 1. Lấy config hiện tại để kiểm tra quyền sở hữu và platform
    const { data: currentConfig, error: fetchError } = await supabase
      .from('prompt_configs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !currentConfig) {
      return NextResponse.json({ error: 'Không tìm thấy cấu hình hoặc lỗi hệ thống' }, { status: 404 });
    }

    // Kiểm tra quyền sở hữu (chỉ chính chủ hoặc admin được sửa)
    if (currentConfig.user_id !== user.id) {
      return NextResponse.json({ error: 'Bạn không có quyền chỉnh sửa cấu hình này' }, { status: 403 });
    }

    const updateData: Record<string, any> = {};
    if (parsed.data.name !== undefined) {
      const newName = parsed.data.name.trim();
      // Nếu đổi tên, kiểm tra trùng tên cấu hình khác cùng user
      if (newName !== currentConfig.name) {
        const { data: existingConfig, error: checkError } = await supabase
          .from('prompt_configs')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', newName)
          .neq('id', id)
          .maybeSingle();

        if (checkError) {
          console.error('[PUT Prompt Config Check Dup Error]:', checkError);
          return NextResponse.json({ error: 'Lỗi kiểm tra trùng tên cấu hình' }, { status: 500 });
        }

        if (existingConfig) {
          return NextResponse.json(
            { error: `Tên cấu hình "${newName}" đã tồn tại. Vui lòng chọn tên khác.` },
            { status: 400 }
          );
        }
      }
      updateData.name = newName;
    }

    if (parsed.data.platform !== undefined) {
      updateData.platform = parsed.data.platform;
    }

    if (parsed.data.rules !== undefined) {
      updateData.rules = parsed.data.rules;
    }

    if (parsed.data.params !== undefined) {
      updateData.params = {
        ...currentConfig.params,
        ...parsed.data.params,
      };
    }

    if (parsed.data.is_default !== undefined) {
      updateData.is_default = parsed.data.is_default;
    }

    updateData.updated_at = new Date().toISOString();

    // 2. Nếu chuyển trạng thái sang default = true, reset các config khác về false
    if (updateData.is_default === true && !currentConfig.is_default) {
      const { error: resetError } = await supabase
        .from('prompt_configs')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true)
        .neq('id', id);

      if (resetError) {
        console.error('[PUT Prompt Config Reset Default Error]:', resetError);
        return NextResponse.json({ error: 'Lỗi khi reset cấu hình mặc định cũ' }, { status: 500 });
      }
    }

    // 3. Thực hiện cập nhật
    const { data: updatedConfig, error: updateError } = await supabase
      .from('prompt_configs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[PUT Prompt Config Update Error]:', updateError);
      return NextResponse.json({ error: 'Không thể cập nhật cấu hình' }, { status: 500 });
    }

    return NextResponse.json({ data: updatedConfig });
  } catch (error: any) {
    console.error('[PUT Prompt Config Unexpected Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

/**
 * DELETE /api/prompt-configs/[id]
 * Xóa cấu hình prompt.
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

    // 1. Lấy config hiện tại để kiểm tra quyền sở hữu
    const { data: currentConfig, error: fetchError } = await supabase
      .from('prompt_configs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !currentConfig) {
      return NextResponse.json({ error: 'Không tìm thấy cấu hình hoặc lỗi hệ thống' }, { status: 404 });
    }

    // Kiểm tra quyền sở hữu
    if (currentConfig.user_id !== user.id) {
      return NextResponse.json({ error: 'Bạn không có quyền xóa cấu hình này' }, { status: 403 });
    }

    // 2. Thực hiện xóa
    const { error: deleteError } = await supabase
      .from('prompt_configs')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DELETE Prompt Config Error]:', deleteError);
      return NextResponse.json({ error: 'Không thể xóa cấu hình' }, { status: 500 });
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch (error: any) {
    console.error('[DELETE Prompt Config Unexpected Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
