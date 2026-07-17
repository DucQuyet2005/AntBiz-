import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl ? createClient(supabaseUrl, serviceRoleKey) : null;

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  console.log(`\n📧 [Email Service] Đang gửi email tới ${options.to}`);
  console.log(`   Tiêu đề: ${options.subject}`);

  const brevoApiKey = process.env.BREVO_API_KEY;

  // ==========================================
  // PHƯƠNG ÁN 1: GỬI QUA BREVO API (CỔNG 443 HTTPS)
  // ==========================================
  if (brevoApiKey) {
    try {
      const fromEmail = process.env.BREVO_FROM_EMAIL || process.env.EMAIL_FROM || 'no-reply@antbiz.vn';
      const fromName = process.env.BREVO_FROM_NAME || 'AntBiz';

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html || options.text.replace(/\n/g, '<br/>'),
          textContent: options.text
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || `Brevo API error: ${response.status}`);
      }

      console.log(`   ✅ Gửi email thành công qua Brevo API (HTTPS)!`);
      return { success: true };
    } catch (err: any) {
      console.error(`   ❌ Gửi email qua Brevo API thất bại:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // ==========================================
  // PHƯƠNG ÁN 2: SMTP FALLBACK (NODEMAILER)
  // ==========================================
  try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

    if (smtpHost && smtpUser && smtpPass) {
      try {
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
        console.error(`   ❌ Gửi email qua SMTP thất bại:`, err.message);
        return { success: false, error: err.message };
      }
    } else {
      console.log(`   ℹ️ Chưa cấu hình API Key hay SMTP. Email ghi tạm ra console.`);
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
  details: string,
  skipEmail = false
) {
  const statusLabel = status === 'success' ? 'THÀNH CÔNG' : 'THẤT BẠI';
  const subject = `[AntBiz] Thông báo kết quả đăng bài: ${statusLabel}`;
  const text = `Xin chào,\n\nBài đăng "${postTitle}" đã được tự động đăng lên Facebook với trạng thái: ${statusLabel}.\n\nChi tiết:\n${details}\n\nTrân trọng,\nĐội ngũ AntBiz`;

  // 1. Gửi thông báo qua Email
  if (userEmail && !skipEmail) {
    await sendEmail({ to: userEmail, subject, text });
  }

  // 2. Lưu lịch sử ghi nhận vào database audit_logs
  try {
    if (!supabase) {
      throw new Error('Supabase client is not initialized due to missing NEXT_PUBLIC_SUPABASE_URL');
    }
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
