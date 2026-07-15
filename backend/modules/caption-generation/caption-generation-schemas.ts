import { z } from 'zod';

export const captionGenerationInputSchema = z
  .object({
    url: z.string().optional(),
    articleId: z.string().optional(),
    promptId: z.string().optional(),
    customPrompt: z.string().optional(),
    platform: z.string().optional(),
    variantGroupId: z.string().optional(),
    variantIndex: z.number().int().min(0, 'variantIndex phải nằm trong khoảng 0–2').max(2, 'variantIndex phải nằm trong khoảng 0–2').default(0),
    oldCaptionId: z.string().optional(),
    authorProfileId: z.string().optional(),
    stylePresetId: z.string().optional(),
    platformPresetId: z.string().optional(),
  })
  .superRefine((input, context) => {
    const isThreads = input.platform === 'threads' || input.platform === 'thread';

    if (!input.promptId && !input.customPrompt && !input.stylePresetId && !input.platformPresetId && !isThreads) {
      context.addIssue({
        code: 'custom',
        message: 'Thiếu thông số cấu hình nội dung (promptId, stylePresetId, hoặc platformPresetId)',
      });
    }

    if (input.customPrompt && !input.platform) {
      context.addIssue({ code: 'custom', message: 'Thiếu platform khi sử dụng customPrompt' });
    }

    if (!input.url && !input.articleId) {
      context.addIssue({ code: 'custom', message: 'Thiếu url hoặc articleId' });
    }
  });

export type CaptionGenerationInput = z.infer<typeof captionGenerationInputSchema>;
