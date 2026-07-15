import { PasswordRecoveryError } from './password-recovery-errors';
import type { ResetPasswordInput } from './password-recovery-types';

export function parseRecoveryRequest(input: unknown): { email: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw validation('Email không hợp lệ.');
  }
  const email = (input as Record<string, unknown>).email;
  if (typeof email !== 'string') throw validation('Email không hợp lệ.');
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw validation('Email không hợp lệ.');
  }
  return { email: normalized };
}

export function parseRecoveryConfirmation(token: unknown, type: unknown): { token: string } {
  if (typeof token !== 'string' || !token.trim() || type !== 'recovery') {
    throw validation('Recovery token không hợp lệ.');
  }
  return { token: token.trim() };
}

export function parseResetPassword(input: unknown): ResetPasswordInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw validation('Dữ liệu không hợp lệ.');
  }
  const record = input as Record<string, unknown>;
  if (typeof record.password !== 'string' || typeof record.confirmPassword !== 'string') {
    throw validation('Dữ liệu không hợp lệ.');
  }
  const password = record.password;
  const confirmPassword = record.confirmPassword;
  if (password.length < 8) throw validation('Mật khẩu phải chứa ít nhất 8 ký tự');
  if (!/[A-Z]/.test(password)) throw validation('Mật khẩu phải chứa ít nhất 1 chữ hoa');
  if (!/[a-z]/.test(password)) throw validation('Mật khẩu phải chứa ít nhất 1 chữ thường');
  if (!/[0-9]/.test(password)) throw validation('Mật khẩu phải chứa ít nhất 1 chữ số');
  if (!confirmPassword) throw validation('Vui lòng xác nhận mật khẩu mới');
  if (password !== confirmPassword) {
    throw validation('Mật khẩu xác nhận không trùng khớp');
  }
  return { password, confirmPassword };
}

function validation(message: string) {
  return new PasswordRecoveryError('VALIDATION', 400, message);
}
