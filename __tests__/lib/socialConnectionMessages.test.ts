import { describe, expect, it } from 'vitest';
import { getSocialConnectionErrorMessage } from '@/lib/socialConnectionMessages';

describe('getSocialConnectionErrorMessage', () => {
  it('maps stable codes to friendly Vietnamese and English messages', () => {
    expect(getSocialConnectionErrorMessage('invalid_state', 'vi', 'Facebook Page'))
      .toContain('Phiên liên kết không hợp lệ');
    expect(getSocialConnectionErrorMessage('provider_unavailable', 'en', 'Meta Threads'))
      .toContain('temporarily unavailable');
  });

  it('does not display an unknown or raw error value', () => {
    const message = getSocialConnectionErrorMessage('raw provider secret', 'vi', 'Instagram Business');
    expect(message).toContain('Đã xảy ra lỗi khi liên kết tài khoản');
    expect(message).not.toContain('raw provider secret');
  });
});
