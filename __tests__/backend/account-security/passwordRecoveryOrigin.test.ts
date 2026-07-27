import { describe, expect, it } from 'vitest';
import { resolvePasswordRecoveryOrigin } from '@/backend/modules/account-security/password-recovery-origin';

describe('Password Recovery trusted origin', () => {
  it('prefers a configured HTTP(S) site and strips path/query/trailing slash', () => {
    expect(resolvePasswordRecoveryOrigin(
      'https://app.antbiz.vn/some/path?value=1', 'http://localhost/request'
    )).toBe('https://app.antbiz.vn');
  });

  it('falls back to the request URL origin for invalid configuration', () => {
    expect(resolvePasswordRecoveryOrigin('javascript:alert(1)', 'http://localhost:3000/api/auth'))
      .toBe('http://localhost:3000');
  });

  it('rejects when neither source is a trusted HTTP(S) URL', () => {
    expect(() => resolvePasswordRecoveryOrigin('ftp://example.com', 'not-a-url'))
      .toThrowError(/trusted HTTP/);
  });
});
