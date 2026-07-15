import { describe, expect, it, vi } from 'vitest';
import { ProductionAccountSecurityEffects } from '@/backend/modules/account-security/account-security-effects';

describe('ProductionAccountSecurityEffects', () => {
  it('creates the existing password-changed notification', async () => {
    const dependencies = deps();
    const effects = new ProductionAccountSecurityEffects(dependencies);
    await effects.createPasswordChangedNotification(actor());
    expect(dependencies.createNotification).toHaveBeenCalledWith({
      userId: 'u1', type: 'info', title: 'Đổi mật khẩu tài khoản',
      message: 'Mật khẩu tài khoản của bạn đã được thay đổi thành công.',
    });
  });

  it('sends a deterministic security email and escapes HTML', async () => {
    const dependencies = deps();
    const effects = new ProductionAccountSecurityEffects(dependencies);
    await effects.sendPasswordChangedEmail(
      { id: 'u1', email: 'user+<alert>@example.com' },
      '2026-07-15T12:00:00.000Z'
    );
    expect(dependencies.formatTimestamp).toHaveBeenCalledWith('2026-07-15T12:00:00.000Z');
    expect(dependencies.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user+<alert>@example.com',
      subject: '[AntBiz] Thông báo thay đổi mật khẩu thành công',
      html: expect.stringContaining('user+&lt;alert&gt;@example.com'),
    }));
  });

  it('turns a structured email failure into a rejected effect', async () => {
    const dependencies = deps();
    dependencies.sendEmail.mockResolvedValue({ success: false, error: 'delivery unavailable' });
    const effects = new ProductionAccountSecurityEffects(dependencies);
    await expect(effects.sendPasswordChangedEmail(actor(), '2026-07-15T12:00:00.000Z'))
      .rejects.toThrow('delivery unavailable');
  });
});

function deps() {
  return {
    createNotification: vi.fn().mockResolvedValue({ id: 'n1' }),
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
    formatTimestamp: vi.fn(() => '19:00:00 15/7/2026'),
  };
}

function actor() {
  return { id: 'u1', email: 'user@example.com' };
}
