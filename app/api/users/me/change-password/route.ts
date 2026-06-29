import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendEmail } from '@/lib/email';
import { createNotification } from '@/lib/services/notificationService';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc.' }, { status: 400 });
    }

    // 1. Verify current password by signing in with it
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      return NextResponse.json({ error: 'Mật khẩu hiện tại không chính xác.' }, { status: 400 });
    }

    // 2. Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. Invalidate all refresh tokens (Global Sign Out)
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });

    if (signOutError) {
      console.error('Lỗi khi thu hồi các session:', signOutError);
    }

    // Gửi thông báo in-app
    try {
      await createNotification({
        userId: user.id,
        type: 'info',
        title: 'Đổi mật khẩu tài khoản',
        message: 'Mật khẩu tài khoản của bạn đã được thay đổi thành công.',
      });
    } catch (err: any) {
      console.error('Lỗi khi tạo thông báo đổi mật khẩu:', err.message);
    }

    // 4. Send email notification
    try {
      await sendEmail({
        to: user.email!,
        subject: '[AntBiz] Thông báo thay đổi mật khẩu thành công',
        text: `Xin chào,\n\nMật khẩu của tài khoản ${user.email} đã được thay đổi thành công vào lúc ${new Date().toLocaleString('vi-VN')}.\n\nNếu bạn không thực hiện yêu cầu này, vui lòng liên hệ quản trị viên ngay lập tức để bảo vệ tài khoản.\n\nTrân trọng,\nĐội ngũ AntBiz`,
        html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Thông báo thay đổi mật khẩu</h2>
          <p>Xin chào,</p>
          <p>Mật khẩu của tài khoản <strong>${user.email}</strong> đã được thay đổi thành công vào lúc <strong>${new Date().toLocaleString('vi-VN')}</strong>.</p>
          <p style="color: #d9534f; font-weight: bold;">Nếu bạn không thực hiện yêu cầu này, vui lòng liên hệ quản trị viên ngay lập tức để bảo vệ tài khoản.</p>
          <br/>
          <p>Trân trọng,<br/>Đội ngũ AntBiz</p>
        </div>`
      });
    } catch (emailErr) {
      console.error('Lỗi khi gửi email xác nhận đổi mật khẩu:', emailErr);
    }

    return NextResponse.json({ success: true, message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
