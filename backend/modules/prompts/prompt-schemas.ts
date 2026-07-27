import { z } from 'zod';

export const PROMPT_PLATFORMS = ['facebook', 'thread', 'instagram'] as const;
const PROMPT_PLATFORM_INPUTS = ['facebook', 'thread', 'threads', 'instagram'] as const;

export function normalizePromptPlatform(platform: string) {
  return platform === 'threads' ? 'thread' : platform;
}

const promptPlatformSchema = z
  .enum(PROMPT_PLATFORM_INPUTS, {
    error: 'Nền tảng phải là facebook, thread/threads hoặc instagram',
  })
  .transform(normalizePromptPlatform);

const promptFields = {
  name: z
    .string()
    .trim()
    .min(1, 'Tên prompt không được để trống')
    .max(200, 'Tên prompt tối đa 200 ký tự'),
  platform: promptPlatformSchema,
  content: z
    .string()
    .trim()
    .min(1, 'Nội dung hướng dẫn không được để trống')
    .max(8000, 'Nội dung hướng dẫn tối đa 8000 ký tự'),
  tags: z
    .array(z.string().trim().min(1, 'Thẻ (tag) không được để trống'))
    .max(20, 'Tối đa 20 thẻ cho mỗi prompt'),
  is_default: z.boolean().optional(),
};

export const createPromptSchema = z.object(promptFields).extend({
  tags: promptFields.tags.default([]),
  is_default: z.boolean().default(false),
});

export const updatePromptSchema = z
  .object(promptFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Cần ít nhất một trường để cập nhật',
  });

export const promptListQuerySchema = z.object({
  platform: promptPlatformSchema.optional(),
  tags: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(20),
});

export type CreatePromptInput = z.infer<typeof createPromptSchema>;
export type UpdatePromptInput = z.infer<typeof updatePromptSchema>;

