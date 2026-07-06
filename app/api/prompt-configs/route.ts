import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { z } from 'zod';

const createConfigSchema = z.object({
  name: z.string().min(1, 'Tên cấu hình không được để trống'),
  platform: z.enum(['facebook', 'thread', 'instagram', 'all']).default('facebook'),
  rules: z.string().optional(),
  params: z.object({
    variant_count: z.number().optional(),
  }).default({}),
  is_default: z.boolean().default(false),
});

/**
 * GET /api/prompt-configs
 * Lấy danh sách cấu hình prompt của người dùng hiện tại (hỗ trợ lọc theo platform).
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await requireUserWithRole([
      'admin',
      'marketer_full',
      'marketer_content',
    ]);
    if (unauthorized) return unauthorized;

    let query = supabase
      .from('prompt_configs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const { data: configs, error } = await query;

    if (error) {
      console.error('[GET Prompt Configs Error]:', error);
      return NextResponse.json({ error: 'Không thể tải danh sách cấu hình' }, { status: 500 });
    }

    return NextResponse.json({ data: configs });
  } catch (error: any) {
    console.error('[GET Prompt Configs Unexpected Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

/**
 * POST /api/prompt-configs
 * Lưu một cấu hình prompt mới.
 */
export async function POST(request: NextRequest) {
  try {
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

    const parsed = createConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const { name, platform, rules, params, is_default } = parsed.data;

    // 1. Kiểm tra trùng tên cấu hình của user này
    const { data: existingConfig, error: checkError } = await supabase
      .from('prompt_configs')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .maybeSingle();

    if (checkError) {
      console.error('[POST Prompt Config Check Error]:', checkError);
      return NextResponse.json({ error: 'Lỗi kiểm tra trùng tên cấu hình' }, { status: 500 });
    }

    if (existingConfig) {
      return NextResponse.json(
        { error: `Tên cấu hình "${name}" đã tồn tại. Vui lòng chọn tên khác.` },
        { status: 400 }
      );
    }

    // 2. Nếu đặt làm mặc định, đặt tất cả config khác của user này về false
    if (is_default) {
      const { error: resetError } = await supabase
        .from('prompt_configs')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true);

      if (resetError) {
        console.error('[POST Prompt Config Reset Default Error]:', resetError);
        return NextResponse.json({ error: 'Lỗi khi reset cấu hình mặc định cũ' }, { status: 500 });
      }
    }

    // 3. Insert cấu hình mới
    const { data: newConfig, error: insertError } = await supabase
      .from('prompt_configs')
      .insert({
        user_id: user.id,
        name: name.trim(),
        platform,
        rules: rules || '',
        params,
        is_default,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[POST Prompt Config Insert Error]:', insertError);
      return NextResponse.json({ error: 'Không thể lưu cấu hình mới' }, { status: 500 });
    }

    return NextResponse.json({ data: newConfig }, { status: 201 });
  } catch (error: any) {
    console.error('[POST Prompt Config Unexpected Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
