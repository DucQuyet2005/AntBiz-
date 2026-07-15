import { UserAccessAdministrationError } from './user-access-administration-errors';
import {
  MUTABLE_USER_STATUSES,
  USER_ROLES,
  USER_STATUSES,
  type MutableUserStatus,
  type UserListInput,
  type UserRole,
  type UserStatus,
} from './user-access-administration-types';

type RawListInput = {
  search?: string | null;
  role?: string | null;
  status?: string | null;
  page?: string | null;
  limit?: string | null;
};

export function parseUserList(input: RawListInput): UserListInput {
  const search = input.search?.trim() || undefined;
  const role = parseOptionalFilter(input.role, USER_ROLES, 'role');
  const status = parseOptionalFilter(input.status, USER_STATUSES, 'status');
  return {
    search,
    role,
    status,
    page: parsePositiveInteger(input.page, 1, 'page'),
    limit: parsePositiveInteger(input.limit, 10, 'limit'),
  };
}

export function parseTargetUserId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw validation('ID người dùng không hợp lệ');
  }
  return value.trim();
}

export function parseRoleMutation(input: unknown): { role: UserRole } {
  const record = parseRecord(input);
  if (!isMember(record.role, USER_ROLES)) {
    throw validation('Vai trò không hợp lệ');
  }
  return { role: record.role };
}

export function parseStatusMutation(input: unknown): {
  status: MutableUserStatus;
  lockedReason: string | null;
} {
  const record = parseRecord(input);
  if (!isMember(record.status, MUTABLE_USER_STATUSES)) {
    throw validation('Trạng thái chỉ có thể là active hoặc locked');
  }

  if (record.status === 'locked') {
    const lockedReason = typeof record.locked_reason === 'string'
      ? record.locked_reason.trim()
      : '';
    if (lockedReason.length < 10) {
      throw validation('Lý do khóa phải có ít nhất 10 ký tự');
    }
    return { status: 'locked', lockedReason };
  }

  return { status: 'active', lockedReason: null };
}

function parsePositiveInteger(value: string | null | undefined, fallback: number, field: string) {
  if (value === null || value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(value)) throw validation(`${field} phải là số nguyên dương`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw validation(`${field} phải là số nguyên dương`);
  }
  return parsed;
}

function parseOptionalFilter<T extends readonly string[]>(
  value: string | null | undefined,
  values: T,
  field: string
): T[number] | undefined {
  if (value === null || value === undefined || value === '' || value === 'all') return undefined;
  if (!isMember(value, values)) throw validation(`${field} không hợp lệ`);
  return value;
}

function parseRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw validation('Nội dung yêu cầu không hợp lệ');
  }
  return input as Record<string, unknown>;
}

function isMember<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

function validation(message: string) {
  return new UserAccessAdministrationError('VALIDATION', 400, message);
}

export type { UserRole, UserStatus };
