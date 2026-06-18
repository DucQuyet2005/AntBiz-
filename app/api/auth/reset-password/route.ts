import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { resetPasswordSchema } from '@/lib/validations/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Validate password inputs
    const validated = resetPasswordSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' },
        { status: 400 }
      );
    }

    const { password } = validated.data;

    // 2. Lấy client Supabase với session hiện tại
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Bạn không có quyền thực hiện hành động này hoặc phiên làm việc đã hết hạn.' },
        { status: 401 }
      );
    }

    // 3. Cập nhật mật khẩu mới
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    // 4. Đăng xuất tất cả thiết bị trên toàn hệ thống
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
    if (signOutError) {
      console.warn('Lỗi khi thực hiện đăng xuất global:', signOutError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công. Tất cả các phiên đăng nhập khác đã được thu hồi.',
    });
  } catch (error: any) {
    console.error('Lỗi khi xử lý reset-password:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
