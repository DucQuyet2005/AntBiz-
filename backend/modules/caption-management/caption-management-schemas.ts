import { z } from 'zod';

const platformSchema = z
  .enum(['facebook', 'thread', 'threads', 'instagram'])
  .transform((platform) => platform === 'threads' ? 'thread' : platform);

export const createCaptionSchema = z.object({
  article_id: z.string().uuid('article_id phải là UUID hợp lệ'),
  platform: platformSchema,
  ai_content: z.string().min(1, 'ai_content không được rỗng'),
  edited_content: z.string().optional().nullable(),
  prompt_id: z.string().uuid().optional(),
  utm_config_id: z.string().uuid().optional(),
});

export const listCaptionsSchema = z.object({
  platform: z.string().default('all'),
  search: z.string().default(''),
  page: z.coerce.number().int().positive('page phải là số nguyên dương').default(1),
  limit: z.coerce.number().int().positive('limit phải là số nguyên dương').default(10),
});

export const updateCaptionSchema = z.object({
  edited_content: z.string().min(1, 'edited_content khong duoc rong').optional().nullable(),
  status: z.enum(['draft', 'edited', 'approved', 'scheduled', 'posted']).optional(),
  is_favorite_template: z.boolean().optional(),
  save_as_original: z.boolean().optional(),
  ai_content: z.string().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'Can it nhat mot truong de cap nhat',
});

export const createCaptionVersionSchema = z.object({
  article_id: z.string().uuid('article_id phải là UUID hợp lệ'),
  platform: platformSchema,
  content: z.string().min(1, 'content không được rỗng'),
  source: z.enum(['ai', 'human']),
  caption_id: z.string().uuid('caption_id phải là UUID hợp lệ').optional().nullable(),
});

export type CreateCaptionInput = z.infer<typeof createCaptionSchema>;
export type ListCaptionsInput = z.infer<typeof listCaptionsSchema>;
export type UpdateCaptionInput = z.infer<typeof updateCaptionSchema>;
export type CreateCaptionVersionInput = z.infer<typeof createCaptionVersionSchema>;
