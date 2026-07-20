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
    if (input.selections && input.selections.length > 1) {
      const texts = input.selections.map((s, i) => `Đoạn ${i + 1}: ${s.text}`).join('\n');
      return `Bạn là Content Marketer chuyên nghiệp. Viết lại đúng CÁC đoạn được chọn cho nền tảng ${input.platform}.

Tiêu đề nguồn: ${input.article.title || ''}
Nội dung nguồn: ${articleContent}
Toàn bộ caption hiện tại: ${input.currentContent}

Các đoạn cần sửa:
${texts}
${presetSection}${instruction}
TRẢ VỀ DUY NHẤT một mảng JSON các chuỗi (string array) tương ứng với từng đoạn thay thế, theo đúng thứ tự. Ví dụ: ["thay thế 1", "thay thế 2"]. KHÔNG giải thích thêm, KHÔNG format markdown.`;
    }

    const selectedText = input.selections?.[0]?.text || '';
    return `Bạn là Content Marketer chuyên nghiệp. Viết lại đúng đoạn được chọn cho nền tảng ${input.platform}.

Tiêu đề nguồn: ${input.article.title || ''}
Nội dung nguồn: ${articleContent}
Toàn bộ caption hiện tại: ${input.currentContent}
Đoạn được chọn: ${selectedText}${presetSection}${instruction}

    LƯU Ý: Tuyệt đối KHÔNG sử dụng các định dạng Markdown như ** (in đậm) hoặc * (in nghiêng/liệt kê) trong câu trả lời. Hãy dùng emoji hoặc xuống dòng để nhấn mạnh nếu cần.
    Chỉ trả về đoạn thay thế, không giải thích, không thêm dấu ngoặc, không lặp lại toàn bộ bài viết hay các phần khác, không thêm lời dẫn.`;
  }

  return `Bạn là Content Marketer chuyên nghiệp. Hãy viết lại toàn bộ caption cho nền tảng ${input.platform}.

Tiêu đề nguồn: ${input.article.title || ''}
Nội dung nguồn: ${articleContent}
Caption hiện tại: ${input.currentContent}${presetSection}${instruction}

LƯU Ý: Tuyệt đối KHÔNG sử dụng các định dạng Markdown như ** (in đậm) hoặc * (in nghiêng/liệt kê) trong câu trả lời. Hãy dùng emoji hoặc xuống dòng để nhấn mạnh nếu cần. Tuyệt đối không lặp lại toàn bộ nội dung bài viết hay phần hashtag nhiều lần.
Trả về trực tiếp bài viết hoàn chỉnh duy nhất, không giải thích hay thêm lời dẫn.`;
}
