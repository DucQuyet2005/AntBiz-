import { z } from 'zod';

export const manualArticleSchema = z.object({
  title: z.string().min(1, 'Thiếu tiêu đề hoặc nội dung bài viết'),
  full_text: z.string().min(1, 'Thiếu tiêu đề hoặc nội dung bài viết'),
  category: z.string().optional(),
  author: z.string().optional(),
  imageUrl: z.string().optional(),
});

export type ManualArticleInput = z.infer<typeof manualArticleSchema>;
