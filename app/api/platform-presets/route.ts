import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { z } from 'zod';

const platformEnum = z.enum(['facebook', 'instagram', 'thread', 'threads']);

const createPresetSchema = z.object({
  platform: platformEnum,
  name: z.string().min(1, 'Tên quy chuẩn không được để trống'),
  rules: z.string().min(1, 'Nội dung quy tắc không được để trống'),
  is_default: z.boolean().default(false),
});

/**
 * GET /api/platform-presets
 * Lấy danh sách quy chuẩn nền tảng (gồm cả mặc định hệ thống và cá nhân tự tạo).
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await requireUserWithRole([
      'admin',
      'marketer_full',
      'marketer_content',
    ]);
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    let platformParam = searchParams.get('platform');

    if (!platformParam) {
      return NextResponse.json({ error: 'Thiếu tham số platform' }, { status: 400 });
    }

    if (platformParam === 'threads') {
      platformParam = 'thread';
    }

    const platform = platformEnum.parse(platformParam);

    // 1. Lấy quy chuẩn của riêng user này
    let { data: presets, error } = await supabase
      .from('platform_presets')
      .select('*')
      .eq('platform', platform)
      .eq('user_id', user.id);
 
    if (error) {
      console.error('[GET Platform Presets Error]:', error);
      return NextResponse.json({ error: 'Không thể tải danh sách quy chuẩn' }, { status: 500 });
    }
 
    // 2. Nếu user chưa có quy chuẩn nào cho nền tảng này, sao chép từ hệ thống (user_id IS NULL) sang cho user
    if (!presets || presets.length === 0) {
      const { data: systemPresets, error: sysError } = await supabase
        .from('platform_presets')
        .select('*')
        .eq('platform', platform)
        .is('user_id', null);
 
      if (!sysError && systemPresets && systemPresets.length > 0) {
        const presetsToCreate = systemPresets.map(sp => ({
          platform: sp.platform,
          name: sp.name,
          rules: sp.rules,
          is_default: true, // Đặt làm mặc định cho user
          user_id: user.id,
          updated_at: new Date().toISOString()
        }));
 
        const { data: inserted, error: insertError } = await supabase
          .from('platform_presets')
          .insert(presetsToCreate)
          .select();
 
        if (insertError) {
          console.error('[GET Platform Presets Clone Error]:', insertError);
        } else if (inserted) {
          presets = inserted;
        }
      }
    }
 
    // Sắp xếp: Bản ghi của user lên trước, sau đó xếp theo tên
    const sortedPresets = (presets || []).sort((a: any, b: any) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return a.name.localeCompare(b.name);
    });
 
    return NextResponse.json({ data: sortedPresets });
  } catch (error: any) {
    console.error('[GET Platform Presets Unexpected Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

/**
 * POST /api/platform-presets
 * Tạo một quy chuẩn nền tảng mới cho user.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await requireUserWithRole([
      'admin',
      'marketer_full',
      'marketer_content',
    ]);
    if (unauthorized) return unauthorized;

    const body = await request.json();
    const parsed = createPresetSchema.parse(body);
    const platform = parsed.platform === 'threads' ? 'thread' : parsed.platform;

    // 1. Nếu đặt làm mặc định, reset các bản ghi cũ của user này
    if (parsed.is_default) {
      await supabase
        .from('platform_presets')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('platform', platform);
    }

    // 2. Chèn bản ghi mới (UPSERT trên user_id, platform, name)
    const { data: preset, error } = await supabase
      .from('platform_presets')
      .upsert({
        user_id: user.id,
        platform,
        name: parsed.name,
        rules: parsed.rules,
        is_default: parsed.is_default,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,platform,name'
      })
      .select()
      .single();

    if (error) {
      console.error('[POST Platform Presets Error]:', error);
      return NextResponse.json({ error: 'Không thể lưu quy chuẩn' }, { status: 500 });
    }

    return NextResponse.json({ data: preset });
  } catch (error: any) {
    console.error('[POST Platform Presets Unexpected Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
