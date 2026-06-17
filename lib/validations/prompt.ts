import { z } from 'zod';

// Phải khớp đúng enum `platform_type` trong database.sql, nếu lệch Postgres sẽ trả lỗi 22P02
export const PROMPT_PLATFORMS = ['facebook', 'thread', 'instagram'] as const;

// Lưu ý: KHÔNG đặt `.default([])` ngay trong field dùng chung này.
// Nếu đặt ở đây, `.partial()` cho updatePromptSchema vẫn áp default khi field bị thiếu,
// khiến input rỗng `{}` bị "lấp đầy" thành `{ tags: [] }` và check "cần ít nhất 1 field" mất tác dụng.
const promptFields = {
  name: z
    .string()
    .trim()
    .min(1, 'Tên prompt không được để trống')
    .max(200, 'Tên prompt tối đa 200 ký tự'),
  platform: z.enum(PROMPT_PLATFORMS, {
    error: 'Nền tảng phải là facebook, thread hoặc instagram',
  }),
  content: z
    .string()
    .trim()
    .min(1, 'Nội dung hướng dẫn không được để trống')
    .max(8000, 'Nội dung hướng dẫn tối đa 8000 ký tự'),
  tags: z
    .array(z.string().trim().min(1, 'Thẻ (tag) không được để trống'))
    .max(20, 'Tối đa 20 thẻ cho mỗi prompt'),
};

export const createPromptSchema = z.object(promptFields).extend({
  tags: promptFields.tags.default([]),
});

// PATCH cho phép sửa từng phần, nhưng phải có ít nhất 1 field
export const updatePromptSchema = z
  .object(promptFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Cần ít nhất một trường để cập nhật',
  });

export const promptListQuerySchema = z.object({
  platform: z.enum(PROMPT_PLATFORMS).optional(),
  tags: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePromptInput = z.infer<typeof createPromptSchema>;
export type UpdatePromptInput = z.infer<typeof updatePromptSchema>;