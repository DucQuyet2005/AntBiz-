import { describe, expect, it } from 'vitest';
import { parseChangePasswordInput } from '@/backend/modules/account-security/account-security-schemas';

describe('Account Security schemas', () => {
  it.each([null, [], 'passwords'])('rejects non-object input %#', (input) => {
    expect(() => parseChangePasswordInput(input)).toThrowError(/không hợp lệ/);
  });

  it('rejects missing, empty, and non-string credentials', () => {
    expect(() => parseChangePasswordInput({ currentPassword: '', newPassword: 'ValidPass1!' }))
      .toThrowError(/bắt buộc/);
    expect(() => parseChangePasswordInput({ currentPassword: 'OldPass1!', newPassword: 123 }))
      .toThrowError(/bắt buộc/);
  });

  it.each([
    ['Short1!', /8 ký tự/],
    ['newpassword1!', /chữ hoa/],
    ['NEWPASSWORD1!', /chữ thường/],
    ['NewPassword!', /chữ số/],
    ['NewPassword1', /ký tự đặc biệt/],
  ])('rejects a weak password: %s', (newPassword, message) => {
    expect(() => parseChangePasswordInput({ currentPassword: 'OldPassword1!', newPassword }))
      .toThrowError(message as RegExp);
  });

  it('returns the existing UI-compatible identical-password message', () => {
    expect(() => parseChangePasswordInput({
      currentPassword: 'SamePassword1!', newPassword: 'SamePassword1!',
    })).toThrowError('New password should be different from the old password.');
  });

  it('does not trim intentional credential whitespace', () => {
    expect(parseChangePasswordInput({
      currentPassword: ' OldPassword1! ', newPassword: ' NewPassword1! ',
    })).toEqual({
      currentPassword: ' OldPassword1! ', newPassword: ' NewPassword1! ',
    });
  });
});
