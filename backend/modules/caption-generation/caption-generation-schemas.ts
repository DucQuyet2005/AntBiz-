import { z } from 'zod';

export const captionGenerationInputSchema = z
  .object({
    url: z.string().optional(),
    articleId: z.string().optional(),
    promptId: z.string().optional(),
    customPrompt: z.string().optional(),
    platform: z.enum(['facebook', 'thread', 'threads', 'instagram']).optional(),
    presetMode: z.enum(['auto', 'selected', 'none']).default('auto'),
    variantGroupId: z.string().optional(),
    variantIndex: z.number().int().min(0, 'variantIndex phải nằm trong khoảng 0–2').max(2, 'variantIndex phải nằm trong khoảng 0–2').default(0),
    oldCaptionId: z.string().optional(),
    authorProfileId: z.string().optional(),
    stylePresetId: z.string().optional(),
    platformPresetId: z.string().optional(),
  })
  .superRefine((input, context) => {
    const isThreads = input.platform === 'threads' || input.platform === 'thread';

    if (!input.promptId && !input.customPrompt && !input.stylePresetId && !input.platformPresetId && !isThreads && input.presetMode !== 'none') {
      context.addIssue({
        code: 'custom',
        message: 'Thiếu thông số cấu hình nội dung (promptId, stylePresetId, hoặc platformPresetId)',
      });
    }

    if (input.customPrompt && !input.platform) {
      context.addIssue({ code: 'custom', message: 'Thiếu platform khi sử dụng customPrompt' });
    }

    if (input.presetMode === 'selected' && !input.platformPresetId) {
      context.addIssue({ code: 'custom', message: 'Thiếu platformPresetId khi chọn Preset' });
    }

    if (input.presetMode === 'selected' && !input.platform) {
      context.addIssue({ code: 'custom', message: 'Thiếu platform khi chọn Preset' });
    }

    if (input.presetMode === 'none' && input.platformPresetId) {
      context.addIssue({ code: 'custom', message: 'Không gửi platformPresetId khi bỏ qua Preset' });
    }

    if (input.presetMode === 'none' && !input.platform) {
      context.addIssue({ code: 'custom', message: 'Thiếu platform khi bỏ qua Preset' });
    }

    if (!input.url && !input.articleId) {
      context.addIssue({ code: 'custom', message: 'Thiếu url hoặc articleId' });
    }
  });

export type CaptionGenerationInput = z.input<typeof captionGenerationInputSchema>;
