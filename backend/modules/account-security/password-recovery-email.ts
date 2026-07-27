import { sendEmail, type EmailOptions } from '@/lib/email';
import type { PasswordRecoveryEmail } from './password-recovery-types';

type RecoveryEmailDependencies = {
  sendEmail: (options: EmailOptions) => Promise<{ success: boolean; error?: string }>;
};

const defaultDependencies: RecoveryEmailDependencies = { sendEmail };

export class AntBizPasswordRecoveryEmail implements PasswordRecoveryEmail {
  constructor(private readonly dependencies: RecoveryEmailDependencies = defaultDependencies) {}

  async sendRecoveryEmail(email: string, actionUrl: string) {
    const safeUrl = escapeHtml(actionUrl);
    const result = await this.dependencies.sendEmail({
      to: email,
      subject: 'Đặt lại mật khẩu tài khoản AntBiz của bạn',
      text: `Xin chào,\n\nChúng tôi đã nhận được yêu cầu đặt lại mật khẩu tài khoản AntBiz của bạn. Vui lòng mở liên kết sau để thiết lập mật khẩu mới:\n\n${actionUrl}\n\nNếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này.\n\nTrân trọng,\nĐội ngũ AntBiz`,
      html: `<div style="font-family: sans-serif; padding: 24px; color: #1c1e2a"><h1>Đặt lại mật khẩu AntBiz</h1><p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu tài khoản của bạn.</p><p><a href="${safeUrl}" style="display: inline-block; background: #5a5cde; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 10px">Đặt lại mật khẩu</a></p><p>Nếu nút không hoạt động, hãy sao chép liên kết sau:</p><p style="word-break: break-all"><a href="${safeUrl}">${safeUrl}</a></p><p>Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này.</p><p>Trân trọng,<br/>Đội ngũ AntBiz</p></div>`,
    });
    if (!result.success) throw new Error(result.error || 'Recovery email delivery failed');
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character] as string);
}
