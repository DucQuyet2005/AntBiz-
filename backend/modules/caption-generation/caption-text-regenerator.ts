import type { CaptionTextRegenerator } from '@/backend/modules/caption-management/caption-management-types';
import { CaptionManagementError } from '@/backend/modules/caption-management/errors';
import {
  CaptionPresetResolutionError,
  resolveCaptionPlatformRules,
} from './caption-preset-resolver';
import type {
  CaptionGenerationRepository,
  GeminiCaptionGateway,
} from './caption-generation-types';

export class GeminiCaptionTextRegenerator implements CaptionTextRegenerator {
  constructor(
    private readonly repository: CaptionGenerationRepository,
    private readonly gemini: GeminiCaptionGateway
  ) {}

  async generate(input: Parameters<CaptionTextRegenerator['generate']>[0]) {
    let platformRules: string | null;
    try {
      platformRules = await resolveCaptionPlatformRules(this.repository, {
        actorId: input.actorId,
        platform: input.platform,
        presetMode: input.presetMode,
        platformPresetId: input.platformPresetId,
      });
    } catch (error) {
      if (error instanceof CaptionPresetResolutionError) {
        throw new CaptionManagementError(
          error.code, error.status, error.clientMessage, error
        );
      }
      throw error;
    }

    const prompt = buildRegenerationPrompt({ ...input, platformRules });
    const fragments = await this.gemini.start({
      title: String(input.article.title || ''),
      content: String(input.article.full_text || input.article.description || ''),
      prompt,
      temperature: 0.7,
    });
    let generatedText = '';
    for await (const fragment of fragments) generatedText += fragment;
    generatedText = generatedText.trim();
    if (!generatedText) {
      throw new CaptionManagementError(
        'CAPTION_REGENERATION_FAILED', 500, 'AI không trả về nội dung'
      );
    }
    return generatedText;
  }
}

function buildRegenerationPrompt(
  input: Parameters<CaptionTextRegenerator['generate']>[0] & { platformRules: string | null }
) {
  const articleContent = String(input.article.full_text || input.article.description || '').slice(0, 3000);
  const presetSection = input.platformRules === null
    ? ''
    : `\nQuy chuẩn Preset:\n${input.platformRules || '(Không có quy chuẩn mặc định)'}\n`;
  const instruction = input.instruction
    ? `\nYêu cầu chỉnh sửa:\n${input.instruction}\n`
    : '';

  if (input.mode === 'partial') {
    return `Bạn là Content Marketer chuyên nghiệp. Viết lại đúng đoạn được chọn cho nền tảng ${input.platform}.

Tiêu đề nguồn: ${input.article.title || ''}
Nội dung nguồn: ${articleContent}
Toàn bộ caption hiện tại: ${input.currentContent}
Đoạn được chọn: ${input.selectedText || ''}${presetSection}${instruction}
Chỉ trả về đoạn thay thế, không giải thích, không thêm dấu ngoặc hay lời dẫn.`;
  }

  return `Bạn là Content Marketer chuyên nghiệp. Hãy viết lại toàn bộ caption cho nền tảng ${input.platform}.

Tiêu đề nguồn: ${input.article.title || ''}
Nội dung nguồn: ${articleContent}
Caption hiện tại: ${input.currentContent}${presetSection}${instruction}
Trả về trực tiếp caption hoàn chỉnh, không giải thích hay thêm lời dẫn.`;
}
