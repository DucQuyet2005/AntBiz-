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

const regenerationPresetSchema = z.object({
  presetMode: z.enum(['auto', 'selected', 'none']).default('auto'),
  platformPresetId: z.string().uuid().optional(),
});

export const regenerateCaptionSchema = z.discriminatedUnion('mode', [
  regenerationPresetSchema.extend({
    mode: z.literal('full'),
    instruction: z.string().trim().max(2000).optional().default(''),
  }),
  regenerationPresetSchema.extend({
    mode: z.literal('partial'),
    selections: z.array(z.object({
      start: z.number().int().nonnegative(),
      end: z.number().int().positive(),
      text: z.string().min(1),
    })).min(1),
    instruction: z.string().trim().min(1).max(2000),
  }),
]).superRefine((input, context) => {
  if (input.presetMode === 'selected' && !input.platformPresetId) {
    context.addIssue({ code: 'custom', message: 'Thiếu platformPresetId khi chọn Preset' });
  }
  if (input.presetMode === 'none' && input.platformPresetId) {
    context.addIssue({ code: 'custom', message: 'Không gửi platformPresetId khi bỏ qua Preset' });
  }
  if (input.mode === 'partial') {
    for (const sel of input.selections) {
      if (sel.end <= sel.start) {
        context.addIssue({ code: 'custom', message: 'Vùng chọn không hợp lệ' });
        break;
      }
    }
  }
});

export type CreateCaptionInput = z.infer<typeof createCaptionSchema>;
export type ListCaptionsInput = z.infer<typeof listCaptionsSchema>;
export type UpdateCaptionInput = z.infer<typeof updateCaptionSchema>;
export type CreateCaptionVersionInput = z.infer<typeof createCaptionVersionSchema>;
export type RegenerateCaptionInput = z.input<typeof regenerateCaptionSchema>;
