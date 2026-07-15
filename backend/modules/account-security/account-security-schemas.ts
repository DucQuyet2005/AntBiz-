import { AccountSecurityError } from './account-security-errors';
import type { ChangePasswordInput } from './account-security-types';

export function parseChangePasswordInput(input: unknown): ChangePasswordInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw validation('Nội dung yêu cầu không hợp lệ.');
  }
  const record = input as Record<string, unknown>;
  if (typeof record.currentPassword !== 'string' || record.currentPassword.length === 0
    || typeof record.newPassword !== 'string' || record.newPassword.length === 0) {
    throw validation('Mật khẩu hiện tại và mật khẩu mới là bắt buộc.');
  }

  const currentPassword = record.currentPassword;
  const newPassword = record.newPassword;
  if (currentPassword === newPassword) {
    throw validation('New password should be different from the old password.');
  }
  if (newPassword.length < 8) {
    throw validation('Mật khẩu mới phải có ít nhất 8 ký tự.');
  }
  if (!/[A-Z]/.test(newPassword)) {
    throw validation('Mật khẩu mới phải có ít nhất một chữ hoa.');
  }
  if (!/[a-z]/.test(newPassword)) {
    throw validation('Mật khẩu mới phải có ít nhất một chữ thường.');
  }
  if (!/[0-9]/.test(newPassword)) {
    throw validation('Mật khẩu mới phải có ít nhất một chữ số.');
  }
  if (!/[^A-Za-z0-9]/.test(newPassword)) {
    throw validation('Mật khẩu mới phải có ít nhất một ký tự đặc biệt.');
  }

  return { currentPassword, newPassword };
}

function validation(message: string) {
  return new AccountSecurityError('VALIDATION', 400, message);
}
