import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { z } from 'zod';

const createProfileSchema = z.object({
  name: z.string().min(1, 'Tên văn phong không được để trống'),
  source_url: z.string().url('Link đối thủ không hợp lệ').or(z.string().length(0)).optional(),
});

/**
 * GET /api/author-profiles
 * Lấy danh sách văn phong tác giả của người dùng hiện tại.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await requireUserWithRole([
      'admin',
      'marketer_full',
      'marketer_content',
    ]);
    if (unauthorized) return unauthorized;

    const { data: profiles, error } = await supabase
      .from('author_profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET Author Profiles Error]:', error);
      return NextResponse.json({ error: 'Không thể tải danh sách văn phong tác giả' }, { status: 500 });
    }

    return NextResponse.json({ data: profiles });
  } catch (error: any) {
    console.error('[GET Author Profiles Unexpected Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

/**
 * POST /api/author-profiles
 * Tạo mới một hồ sơ văn phong tác giả.
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

    const parsed = createProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const { name, source_url } = parsed.data;

    // Kiểm tra xem tên văn phong có trùng trong danh sách của user này không
    const { data: existingProfile, error: checkError } = await supabase
      .from('author_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .maybeSingle();

    if (checkError) {
      console.error('[POST Author Profile Check Error]:', checkError);
      return NextResponse.json({ error: 'Lỗi kiểm tra trùng tên văn phong' }, { status: 500 });
    }

    if (existingProfile) {
      return NextResponse.json(
        { error: `Tên văn phong "${name}" đã tồn tại. Vui lòng chọn tên khác.` },
        { status: 400 }
      );
    }

    // Insert văn phong mới vào database
    const { data: newProfile, error: insertError } = await supabase
      .from('author_profiles')
      .insert({
        user_id: user.id,
        name: name.trim(),
        source_url: source_url?.trim() || null,
        sample_posts: [],
        tuning_status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[POST Author Profile Insert Error]:', insertError);
      return NextResponse.json({ error: 'Không thể tạo văn phong tác giả mới' }, { status: 500 });
    }

    return NextResponse.json({ data: newProfile }, { status: 201 });
  } catch (error: any) {
    console.error('[POST Author Profile Unexpected Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
