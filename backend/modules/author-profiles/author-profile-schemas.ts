import { z } from 'zod';

const sourceUrlSchema = z.preprocess(
  (value) => typeof value === 'string' ? value.trim() : value,
  z.string().url('Link đối thủ không hợp lệ').or(z.literal(''))
).optional();

export const createAuthorProfileSchema = z.object({
  name: z.string().trim().min(1, 'Tên văn phong không được để trống'),
  source_url: sourceUrlSchema,
});

export const updateAuthorProfileSchema = z.object({
  name: z.string().trim().min(1, 'Tên văn phong không được để trống').optional(),
  source_url: sourceUrlSchema,
}).strict();

export type CreateAuthorProfileInput = z.infer<typeof createAuthorProfileSchema>;
export type UpdateAuthorProfileInput = z.infer<typeof updateAuthorProfileSchema>;
