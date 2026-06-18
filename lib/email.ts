import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, serviceRoleKey);

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Gửi thông báo qua email. Sẽ ghi log ra console nếu SMTP chưa được cấu hình.
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  console.log(`\n📧 [Email Service] Đang gửi email tới ${options.to}`);
  console.log(`   Tiêu đề: ${options.subject}`);
  console.log(`   Nội dung: ${options.text}`);

  try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        // Import nodemailer động để tránh lỗi lúc khởi động nếu không cài thư viện
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'no-reply@antbiz.vn',
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });

        console.log(`   ✅ Gửi email thành công qua SMTP!`);
      } catch (err: any) {
        console.error(`   ❌ Gửi email qua SMTP thất bại (Nodemailer error):`, err.message);
        return { success: false, error: err.message };
      }
    } else {
      console.log(`   ℹ️ Chưa cấu hình SMTP. Email được ghi tạm ra console.`);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Ghi nhận hoạt động đăng bài vào bảng audit_logs và gửi email thông báo kết quả.
 */
export async function logAndNotifyPublishResult(
  userId: string,
  userEmail: string,
  postTitle: string,
  status: 'success' | 'failed',
  details: string
) {
  const statusLabel = status === 'success' ? 'THÀNH CÔNG' : 'THẤT BẠI';
  const subject = `[AntBiz] Thông báo kết quả đăng bài: ${statusLabel}`;
  const text = `Xin chào,\n\nBài đăng "${postTitle}" đã được tự động đăng lên Facebook với trạng thái: ${statusLabel}.\n\nChi tiết:\n${details}\n\nTrân trọng,\nĐội ngũ AntBiz`;

  // 1. Gửi thông báo qua Email
  if (userEmail) {
    await sendEmail({ to: userEmail, subject, text });
  }

  // 2. Lưu lịch sử ghi nhận vào database audit_logs
  try {
    await supabase.from('audit_logs').insert({
      actor_id: userId,
      action: status === 'success' ? 'publish_post_success' : 'publish_post_failed',
      after_value: {
        postTitle,
        status,
        details,
        timestamp: new Date().toISOString(),
      },
    });
    console.log(`   📝 Đã ghi nhận lịch sử vào bảng audit_logs`);
  } catch (err: any) {
    console.error(`   ⚠️ Không thể lưu lịch sử hoạt động đăng bài vào audit_logs:`, err.message);
  }
}
