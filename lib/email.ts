import { createClient } from '@supabase/supabase-js';
import type { ScheduledPostRecord } from '@/backend/modules/scheduled-publishing/scheduled-publishing-types';

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
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`   ❌ Gửi email qua Brevo API thất bại:`, error.message);
      return { success: false, error: error.message };
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
      } catch (err: unknown) {
        const error = err as Error;
        console.error(`   ❌ Gửi email qua SMTP thất bại:`, error.message);
        return { success: false, error: error.message };
      }
    } else {
      console.log(`   ℹ️ Chưa cấu hình API Key hay SMTP. Email ghi tạm ra console.`);
    }

    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
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
  // const statusLabel = status === 'success' ? 'THÀNH CÔNG' : 'THẤT BẠI';
  // const subject = `[AntBiz] Thông báo kết quả đăng bài: ${statusLabel}`;
  // const text = `Xin chào,\n\nBài đăng "${postTitle}" đã được tự động đăng lên Facebook với trạng thái: ${statusLabel}.\n\nChi tiết:\n${details}\n\nTrân trọng,\nĐội ngũ AntBiz`;

  // 1. Gửi thông báo qua Email (Đã được tắt để chuyển sang gửi email tổng hợp lúc 20:00 hàng ngày)
  // if (userEmail) {
  //   await sendEmail({ to: userEmail, subject, text });
  // }

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
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`   ⚠️ Không thể lưu lịch sử hoạt động đăng bài vào audit_logs:`, error.message);
  }
}

export async function sendDailySummaryEmails() {
  if (!supabase) {
    console.error('Supabase client is not initialized for daily summary emails');
    return;
  }

  console.log('[Email Service] Đang chạy tổng hợp báo cáo đăng bài hàng ngày...');
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayIso = startOfToday.toISOString();

  try {
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select(`
        id,
        status,
        platform,
        scheduled_at,
        posted_at,
        failed_at,
        failure_reason,
        created_by,
        captions (
          id,
          ai_content,
          edited_content,
          articles (
            id,
            title
          )
        )
      `)
      .gte('updated_at', startOfTodayIso)
      .in('status', ['posted', 'failed']);

    if (error) {
      throw error;
    }

    const posts = (data || []) as unknown as ScheduledPostRecord[];

    if (posts.length === 0) {
      console.log('   ℹ️ Không có bài đăng nào được thực hiện hôm nay để gửi báo cáo.');
      return;
    }

    const postsByUser: Record<string, ScheduledPostRecord[]> = {};
    for (const post of posts) {
      let email: string | undefined;
      
      // Fetch email manually for this user to be 100% sure we get it
      if (post.created_by) {
        const { data: userData } = await supabase
          .from('users')
          .select('email')
          .eq('id', post.created_by)
          .single();
        if (userData?.email) {
          email = userData.email;
        }
      }
      
      if (email) {
        if (!postsByUser[email]) {
          postsByUser[email] = [];
        }
        postsByUser[email].push(post);
      }
    }

    for (const [email, userPosts] of Object.entries(postsByUser)) {
      const postedCount = userPosts.filter(p => p.status === 'posted').length;
      const failedCount = userPosts.filter(p => p.status === 'failed').length;
      
      const subject = `[AntBiz] Báo cáo tổng hợp kết quả đăng bài ngày ${new Date().toLocaleDateString('vi-VN')}`;
      
      let html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #F95A19; border-bottom: 2px solid #F95A19; padding-bottom: 10px;">Báo cáo đăng bài AntBiz</h2>
          <p>Xin chào,</p>
          <p>Dưới đây là tóm tắt kết quả đăng bài của bạn trong ngày hôm nay:</p>
          
          <div style="display: flex; gap: 20px; margin: 20px 0;">
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; flex: 1; text-align: center;">
              <span style="font-size: 24px; font-weight: bold; color: #16a34a;">${postedCount}</span>
              <div style="font-size: 12px; color: #15803d; margin-top: 5px;">Thành công</div>
            </div>
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; flex: 1; text-align: center;">
              <span style="font-size: 24px; font-weight: bold; color: #dc2626;">${failedCount}</span>
              <div style="font-size: 12px; color: #b91c1c; margin-top: 5px;">Thất bại</div>
            </div>
          </div>
          
          <h3>Chi tiết bài đăng:</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background-color: #f3f4f6; text-align: left;">
                <th style="padding: 10px; border: 1px solid #e5e7eb; font-size: 12px;">Bài viết / Caption</th>
                <th style="padding: 10px; border: 1px solid #e5e7eb; font-size: 12px;">Nền tảng</th>
                <th style="padding: 10px; border: 1px solid #e5e7eb; font-size: 12px;">Kết quả</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      for (const post of userPosts) {
        const captionText = post.captions?.edited_content || post.captions?.ai_content || '';
        const articleTitle = post.captions?.articles?.title || 'Bài viết không tên';
        const titleSnippet = articleTitle + (captionText ? ` (${captionText.slice(0, 30)}...)` : '');
        const platformName = post.platform === 'facebook' ? 'Facebook' : post.platform === 'instagram' ? 'Instagram' : 'Threads';
        const statusText = post.status === 'posted' 
          ? '<span style="color: #16a34a; font-weight: bold;">Thành công</span>' 
          : `<span style="color: #dc2626; font-weight: bold;">Thất bại</span><br/><span style="font-size: 10px; color: #6b7280;">Lý do: ${post.failure_reason || 'Không xác định'}</span>`;
          
        html += `
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 12px;">${titleSnippet}</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 12px;">${platformName}</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 12px;">${statusText}</td>
          </tr>
        `;
      }
      
      html += `
            </tbody>
          </table>
          <p style="margin-top: 30px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 15px;">
            Báo cáo tự động từ hệ thống AntBiz.
          </p>
        </div>
      `;
      
      const text = `Báo cáo đăng bài ngày hôm nay của bạn: Thành công: ${postedCount}, Thất bại: ${failedCount}. Vui lòng xem email định dạng HTML để biết chi tiết.`;
      
      await sendEmail({ to: email, subject, text, html });
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[Email Service] Lỗi khi chạy tổng hợp báo cáo đăng bài hàng ngày:', error.message);
  }
}
