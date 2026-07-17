import { z } from 'zod';
import { NotificationError } from './errors';
import type {
  CreateNotificationInput,
  NotificationCategory,
  NotificationListInput,
} from './notification-types';

const notificationTypeSchema = z.enum([
  'post_success', 'post_failed', 'ab_test_complete', 'info',
]);

const createSchema = z.object({
  userId: z.string().trim().min(1),
  type: notificationTypeSchema,
  title: z.string().trim().min(1),
  message: z.string().trim().min(1),
  metadata: z.unknown().optional(),
  emailSent: z.boolean().optional(),
});

const categories = new Set<NotificationCategory>([
  'all', 'bai-dang', 'prompt', 'lich', 'he-thong',
]);

export function parseCreateNotification(input: unknown): CreateNotificationInput {
  const result = createSchema.safeParse(input);
  if (!result.success) {
    throw validation('Thiếu các trường bắt buộc hoặc loại thông báo không hợp lệ');
  }
  return result.data;
}

export function parseNotificationList(input: {
  page?: string | null;
  limit?: string | null;
  category?: string | null;
  type?: string | null;
}): NotificationListInput {
  const page = parsePositiveInteger(input.page, 1);
  const limit = parsePositiveInteger(input.limit, 10);
  const rawCategory = input.category || input.type || 'all';
  const category = categories.has(rawCategory as NotificationCategory)
    ? rawCategory as NotificationCategory
    : 'all';
  return { page, limit, category };
}

export function parseNotificationId(input: unknown) {
  if (typeof input !== 'string' || !input.trim()) {
    throw validation('Mã thông báo không hợp lệ');
  }
  return input.trim();
}

function parsePositiveInteger(value: string | null | undefined, fallback: number) {
  if (value === undefined || value === null || value === '') return fallback;
  if (!/^\d+$/.test(value)) throw validation('page và limit phải là số nguyên dương');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw validation('page và limit phải là số nguyên dương');
  }
  return parsed;
}

const settingsUpdateSchema = z.object({
  email_on_success: z.boolean().optional(),
  email_on_failure: z.boolean().optional(),
  email_digest_enabled: z.boolean().optional(),
  email_digest_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Khung giờ phải ở định dạng HH:MM').optional(),
});

export function parseUpdateSettings(input: unknown) {
  const result = settingsUpdateSchema.safeParse(input);
  if (!result.success) {
    throw validation(result.error.errors[0]?.message || 'Dữ liệu cấu hình không hợp lệ');
  }
  return result.data;
}

function validation(message: string) {
  return new NotificationError('VALIDATION', 400, message);
}
