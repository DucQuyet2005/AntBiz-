import { sendEmail, type EmailOptions } from '@/lib/email';
import { createNotification } from '@/lib/services/notificationService';
import type { AccountSecurityActor, AccountSecurityEffects } from './account-security-types';

type EffectDependencies = {
  createNotification: typeof createNotification;
  sendEmail: (options: EmailOptions) => Promise<{ success: boolean; error?: string }>;
  formatTimestamp: (timestamp: string) => string;
};

const defaultDependencies: EffectDependencies = {
  createNotification,
  sendEmail,
  formatTimestamp: (timestamp) => new Date(timestamp).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }),
};

export class ProductionAccountSecurityEffects implements AccountSecurityEffects {
  constructor(private readonly dependencies: EffectDependencies = defaultDependencies) {}

  async createPasswordChangedNotification(actor: AccountSecurityActor) {
    await this.dependencies.createNotification({
      userId: actor.id,
      type: 'info',
      title: 'Đổi mật khẩu tài khoản',
      message: 'Mật khẩu tài khoản của bạn đã được thay đổi thành công.',
    });
  }

  async sendPasswordChangedEmail(actor: AccountSecurityActor, changedAt: string) {
    const formattedTime = this.dependencies.formatTimestamp(changedAt);
    const escapedEmail = escapeHtml(actor.email);
    const result = await this.dependencies.sendEmail({
      to: actor.email,
      subject: '[AntBiz] Thông báo thay đổi mật khẩu thành công',
      text: `Xin chào,\n\nMật khẩu của tài khoản ${actor.email} đã được thay đổi thành công vào lúc ${formattedTime}.\n\nNếu bạn không thực hiện yêu cầu này, vui lòng liên hệ quản trị viên ngay lập tức để bảo vệ tài khoản.\n\nTrân trọng,\nĐội ngũ AntBiz`,
      html: `<div style="font-family: sans-serif; padding: 20px; color: #333"><h2>Thông báo thay đổi mật khẩu</h2><p>Xin chào,</p><p>Mật khẩu của tài khoản <strong>${escapedEmail}</strong> đã được thay đổi thành công vào lúc <strong>${escapeHtml(formattedTime)}</strong>.</p><p style="color: #d9534f; font-weight: bold">Nếu bạn không thực hiện yêu cầu này, vui lòng liên hệ quản trị viên ngay lập tức để bảo vệ tài khoản.</p><p>Trân trọng,<br/>Đội ngũ AntBiz</p></div>`,
    });
    if (!result.success) throw new Error(result.error || 'Email delivery failed');
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character] as string);
}
