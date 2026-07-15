import { z } from 'zod';

const PLATFORM_INPUTS = ['facebook', 'instagram', 'thread', 'threads'] as const;

export function normalizePresetPlatform(platform: string) {
  return platform === 'threads' ? 'thread' : platform;
}

export const platformPresetPlatformSchema = z
  .enum(PLATFORM_INPUTS, {
    error: 'Nền tảng phải là facebook, instagram hoặc thread/threads',
  })
  .transform(normalizePresetPlatform);

export const createPlatformPresetSchema = z.object({
  platform: platformPresetPlatformSchema,
  name: z.string().min(1, 'Tên quy chuẩn không được để trống'),
  rules: z.string().min(1, 'Nội dung quy tắc không được để trống'),
  is_default: z.boolean().default(false),
});

export const updatePlatformPresetSchema = z.object({
  name: z.string().min(1, 'Tên quy chuẩn không được để trống').optional(),
  rules: z.string().min(1, 'Nội dung quy tắc không được để trống').optional(),
  is_default: z.boolean().optional(),
});

export type CreatePlatformPresetInput = z.infer<typeof createPlatformPresetSchema>;
export type UpdatePlatformPresetInput = z.infer<typeof updatePlatformPresetSchema>;
