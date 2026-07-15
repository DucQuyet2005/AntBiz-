import { describe, expect, it, vi } from 'vitest';
import { AntBizPasswordRecoveryEmail } from '@/backend/modules/account-security/password-recovery-email';

describe('AntBizPasswordRecoveryEmail', () => {
  it('sends AntBiz recovery content and escapes the URL in HTML', async () => {
    const sendEmail = vi.fn().mockResolvedValue({ success: true });
    const email = new AntBizPasswordRecoveryEmail({ sendEmail });
    const actionUrl = 'https://app.antbiz.vn/api/auth/confirm?token_hash=a%26b&type=recovery';
    await email.sendRecoveryEmail('user@example.com', actionUrl);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user@example.com',
      subject: expect.stringContaining('AntBiz'),
      text: expect.stringContaining(actionUrl),
      html: expect.stringContaining('a%26b&amp;type=recovery'),
    }));
  });

  it('rejects structured delivery failures', async () => {
    const email = new AntBizPasswordRecoveryEmail({
      sendEmail: vi.fn().mockResolvedValue({ success: false, error: 'unavailable' }),
    });
    await expect(email.sendRecoveryEmail('user@example.com', 'https://app.antbiz.vn/reset'))
      .rejects.toThrow('unavailable');
  });
});
