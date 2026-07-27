import { z } from 'zod';

const promptConfigParamsSchema = z.object({
  variant_count: z.number().optional(),
});

export const createPromptConfigSchema = z.object({
  name: z.string().min(1, 'Tên cấu hình không được để trống'),
  platform: z.enum(['facebook', 'thread', 'instagram', 'all']).default('facebook'),
  rules: z.string().optional(),
  params: promptConfigParamsSchema.default({}),
  is_default: z.boolean().default(false),
});

export const updatePromptConfigSchema = z.object({
  name: z.string().min(1, 'Tên cấu hình không được để trống').optional(),
  platform: z.enum(['facebook', 'thread', 'instagram', 'all']).optional(),
  rules: z.string().optional(),
  params: promptConfigParamsSchema.optional(),
  is_default: z.boolean().optional(),
});

export type CreatePromptConfigInput = z.infer<typeof createPromptConfigSchema>;
export type UpdatePromptConfigInput = z.infer<typeof updatePromptConfigSchema>;

