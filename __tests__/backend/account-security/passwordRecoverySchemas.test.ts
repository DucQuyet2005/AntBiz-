import { describe, expect, it } from 'vitest';
import {
  parseRecoveryConfirmation,
  parseRecoveryRequest,
  parseResetPassword,
} from '@/backend/modules/account-security/password-recovery-schemas';

describe('Password Recovery schemas', () => {
  it('normalizes a valid recovery email', () => {
    expect(parseRecoveryRequest({ email: ' User@Example.COM ' }))
      .toEqual({ email: 'user@example.com' });
  });

  it.each([null, [], {}, { email: 'invalid' }])('rejects invalid recovery input %#', (input) => {
    expect(() => parseRecoveryRequest(input)).toThrowError(/Email/);
  });

  it('accepts only a non-empty recovery token and recovery type', () => {
    expect(parseRecoveryConfirmation(' token ', 'recovery')).toEqual({ token: 'token' });
    expect(() => parseRecoveryConfirmation('', 'recovery')).toThrow();
    expect(() => parseRecoveryConfirmation('token', 'signup')).toThrow();
  });

  it.each([
    [{ password: 'Short1', confirmPassword: 'Short1' }, /8 ký tự/],
    [{ password: 'password1', confirmPassword: 'password1' }, /chữ hoa/],
    [{ password: 'PASSWORD1', confirmPassword: 'PASSWORD1' }, /chữ thường/],
    [{ password: 'Password', confirmPassword: 'Password' }, /chữ số/],
    [{ password: 'Password1', confirmPassword: '' }, /xác nhận/],
    [{ password: 'Password1', confirmPassword: 'Different1' }, /không trùng/],
  ])('rejects invalid reset input %#', (input, message) => {
    expect(() => parseResetPassword(input)).toThrowError(message as RegExp);
  });

  it('accepts the current reset UI password policy without requiring special characters', () => {
    expect(parseResetPassword({ password: 'Password1', confirmPassword: 'Password1' }))
      .toEqual({ password: 'Password1', confirmPassword: 'Password1' });
  });
});
