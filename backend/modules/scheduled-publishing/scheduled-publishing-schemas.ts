import { z } from 'zod';
import { ScheduledPublishingError } from './errors';
import type { CalendarFilters, PublishingPlatform } from './scheduled-publishing-types';

const scheduleSchema = z.object({
  captionId: z.string().trim().min(1),
  scheduledAt: z.string().trim().min(1),
  imageUrls: z.array(z.string()).nullable().optional(),
  mediaUrl: z.string().nullable().optional(),
});

const publishNowSchema = z.object({
  captionId: z.string().trim().min(1),
  imageUrls: z.array(z.string()).nullable().optional(),
  mediaUrl: z.string().nullable().optional(),
});

const rescheduleSchema = z.object({ scheduledAt: z.string().trim().min(1) });
const bulkRescheduleSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1),
  scheduledAt: z.string().trim().min(1),
});

export type ScheduleInput = z.infer<typeof scheduleSchema>;
export type PublishNowInput = z.infer<typeof publishNowSchema>;
export type RescheduleInput = z.infer<typeof rescheduleSchema>;
export type BulkRescheduleInput = z.infer<typeof bulkRescheduleSchema>;

export function parseScheduleInput(input: unknown) {
  return parseSchema(scheduleSchema, input, 'Thiếu thông tin captionId hoặc scheduledAt');
}

export function parsePublishNowInput(input: unknown) {
  return parseSchema(publishNowSchema, input, 'Thiếu thông tin captionId');
}

export function parseRescheduleInput(input: unknown) {
  return parseSchema(rescheduleSchema, input, 'Thiếu thông tin scheduledAt');
}

export function parseBulkRescheduleInput(input: unknown) {
  const parsed = parseSchema(
    bulkRescheduleSchema,
    input,
    'Thiếu thông tin ids hoặc scheduledAt'
  );
  const ids = [...new Set(parsed.ids)];
  if (ids.length !== parsed.ids.length) {
    throw validationError('Danh sách ids không được chứa giá trị trùng lặp');
  }
  return { ...parsed, ids };
}

export function requireFutureIso(value: string, now: Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw validationError('Thời gian lên lịch không hợp lệ');
  }
  if (date.getTime() <= now.getTime()) {
    throw validationError('Chỉ được phép lên lịch đăng bài cho thời gian trong tương lai');
  }
  return date.toISOString();
}

export function parseCalendarFilters(searchParams: URLSearchParams): CalendarFilters {
  const platformsValue = searchParams.get('platforms');
  const arrayValues = searchParams.getAll('platforms[]');
  const rawPlatforms = platformsValue
    ? platformsValue.split(',')
    : arrayValues;
  const platforms = rawPlatforms
    .map((value) => normalizeCalendarPlatform(value.trim().toLowerCase()))
    .filter(Boolean);
  return {
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    platforms: platforms.length ? [...new Set(platforms)] : undefined,
  };
}

function normalizeCalendarPlatform(value: string) {
  if (value === 'fb') return 'facebook';
  if (value === 'ig') return 'instagram';
  if (value === 'threads') return 'thread';
  return value;
}

export function normalizePlatform(value: string): PublishingPlatform | null {
  if (value === 'fb') return 'facebook';
  if (value === 'ig') return 'instagram';
  if (value === 'threads') return 'thread';
  if (value === 'facebook' || value === 'instagram' || value === 'thread') return value;
  return null;
}

function parseSchema<T>(schema: z.ZodType<T>, input: unknown, message: string): T {
  const result = schema.safeParse(input);
  if (!result.success) throw validationError(message);
  return result.data;
}

function validationError(message: string) {
  return new ScheduledPublishingError('VALIDATION', 400, message);
}
