import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { forgotPasswordSchema } from '@/lib/validations/auth';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Validate email
    const validated = forgotPasswordSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Email không hợp lệ.' },
        { status: 400 }
      );
    }

    const { email } = validated.data;
    const { origin } = new URL(request.url);

    // 2. Tạo link khôi phục qua Supabase Admin client
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    // Nếu có lỗi (ví dụ: email chưa được đăng ký), ta vẫn trả về 200 để tránh dò quét email.
    if (error || !data?.properties?.hashed_token) {
      console.warn('Sinh link recovery lỗi hoặc không tìm thấy hashed_token:', error?.message);
      return NextResponse.json({
        message: 'Nếu tài khoản tồn tại trên hệ thống, email hướng dẫn đặt lại mật khẩu đã được gửi đi.',
      });
    }

    const hashedToken = data.properties.hashed_token;
    const actionLink = `${origin}/api/auth/confirm?token_hash=${hashedToken}&type=recovery&next=/reset-password`;

    // 3. Gửi email qua Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465', // true cho 465, false cho các cổng khác
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const emailTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Đặt lại mật khẩu - Bento Studio</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #F4F5F9;
            color: #1C1E2A;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 580px;
            margin: 40px auto;
            background-color: #FFFFFF;
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            border: 1px solid #E9EAF5;
          }
          .logo {
            font-size: 24px;
            font-weight: 700;
            color: #5A5CDE;
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .logo-box {
            width: 28px;
            height: 28px;
            background-color: #5A5CDE;
            border-radius: 6px;
          }
          h1 {
            font-size: 24px;
            font-weight: 700;
            line-height: 1.3;
            margin-top: 0;
            margin-bottom: 16px;
            letter-spacing: -0.02em;
          }
          p {
            font-size: 15px;
            line-height: 1.6;
            color: #6B7280;
            margin-top: 0;
            margin-bottom: 24px;
          }
          .btn-container {
            margin: 32px 0;
          }
          .btn {
            display: inline-block;
            background-color: #5A5CDE;
            color: #FFFFFF !important;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            padding: 12px 32px;
            border-radius: 12px;
            transition: background-color 0.2s;
            text-align: center;
          }
          .btn:hover {
            background-color: #4A4CBF;
          }
          .divider {
            border-top: 1px solid #E9EAF5;
            margin: 32px 0;
          }
          .footer {
            font-size: 12px;
            color: #9CA3AF;
            line-height: 1.5;
          }
          .link-fallback {
            word-break: break-all;
            font-size: 13px;
            color: #5A5CDE;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <span style="font-weight: 800; color: #5A5CDE;">Bento Studio</span>
          </div>
          <h1>Yêu cầu đặt lại mật khẩu</h1>
          <p>Xin chào,</p>
          <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu từ tài khoản Bento Studio của bạn. Vui lòng bấm vào nút dưới đây để thiết lập mật khẩu mới:</p>
          
          <div class="btn-container">
            <a href="${actionLink}" class="btn" target="_blank">Đặt lại mật khẩu</a>
          </div>

          <p>Đường liên kết này có hiệu lực trong vòng 60 phút. Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này và mật khẩu của bạn sẽ được giữ nguyên.</p>
          
          <div class="divider"></div>
          
          <p class="footer">Nếu nút phía trên không hoạt động, vui lòng sao chép và dán liên kết dưới đây vào trình duyệt của bạn:</p>
          <p class="link-fallback"><a href="${actionLink}">${actionLink}</a></p>
          
          <div class="divider"></div>
          <p class="footer">Trân trọng,<br>Đội ngũ Bento Studio</p>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Bento Studio" <noreply@bentostudio.com>',
      to: email,
      subject: 'Đặt lại mật khẩu tài khoản Bento Studio của bạn',
      html: emailTemplate,
    });

    return NextResponse.json({
      message: 'Nếu tài khoản tồn tại trên hệ thống, email hướng dẫn đặt lại mật khẩu đã được gửi đi.',
    });
  } catch (error: any) {
    console.error('Lỗi khi xử lý forgot-password:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
