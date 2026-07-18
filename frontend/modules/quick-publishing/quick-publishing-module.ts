import { QuickPublishingError, toQuickPublishingFailure } from './quick-publishing-errors';
import type {
  DraftInput,
  GenerateBatchInput,
  GenerateCaptionCommand,
  QuickPublishingClient,
  QuickPublishingEvent,
  QuickPublishingPlatform,
  QuickPublishingPreset,
  PublishInput,
  RegenerateCaptionInput,
  ScheduleInput,
} from './quick-publishing-types';

const QUICK_PICK_LABELS: Record<string, string> = {
  cta: 'Thêm kêu gọi hành động',
  quote: 'Bắt đầu bằng câu trích dẫn',
  emoji: 'Sử dụng nhiều emoji',
  stats: 'Tập trung vào số liệu',
  hashtag: 'Tập trung hashtag độc quyền',
};

const GENERATION_VARIANT_PROMPTS = [
  '',
  'Lưu ý cho biến thể này: Hãy viết theo phong cách cực kỳ thân thiện, sử dụng emoji phù hợp, đặt câu hỏi gợi mở ở cuối bài để kích thích thảo luận và tương tác. Mở đầu bằng một câu ấn tượng tạo sự tò mò. CTA rõ ràng ở cuối.',
  'Lưu ý cho biến thể này: Hãy viết ngắn gọn, súc tích, tập trung vào dữ liệu và sự kiện quan trọng. Không sử dụng emoji. Phong cách báo chí chuyên nghiệp, đúng trọng tâm. Hashtag ngắn gọn, hiệu quả.',
];

const REGENERATION_VARIANT_PROMPTS = [
  '',
  'Lưu ý cho biến thể này: Hãy viết theo phong cách cực kỳ thân thiện, sử dụng emoji phù hợp, đặt câu hỏi gợi mở ở cuối bài để kích thích thảo luận và tương tác.',
  'Lưu ý cho biến thể này: Hãy viết ngắn gọn, súc tích, facts-driven, không emoji, phong cách báo chí chuyên nghiệp.',
];

export class QuickPublishingModule {
  constructor(
    private readonly client: QuickPublishingClient,
    private readonly now: () => Date = () => new Date()
  ) {}

  async loadPresets(
    platform: QuickPublishingPlatform,
    savedPresetId?: string
  ): Promise<{ presets: QuickPublishingPreset[]; selectedPresetId: string }> {
    const presets = await this.client.listPresets(platform);
    const selected = selectPreset(presets, savedPresetId);
    return { presets, selectedPresetId: selected?.id ?? '' };
  }

  async generate(
    input: GenerateBatchInput,
    emit: (event: QuickPublishingEvent) => void,
    signal?: AbortSignal
  ) {
    if (!input.articleId && !input.url?.trim()) throw new QuickPublishingError('SOURCE_INVALID');
    const commands = input.platforms.flatMap((platform) => input.variantIds.map((variantId, position) => {
      const variantIndex = input.variantIndexes?.[position] ?? position;
      return {
        platform, variantId, variantIndex,
        command: buildGenerateCommand(input, platform, variantIndex),
      };
    }));
    await Promise.all(commands.map(({ platform, variantId, variantIndex, command }) => (
      this.runGenerationCommand(command, platform, variantId, variantIndex, emit, signal)
    )));
  }

  async ensureDraft(input: DraftInput, emit?: (event: QuickPublishingEvent) => void) {
    if (!input.currentContent.trim()) throw new QuickPublishingError('CAPTION_SAVE_FAILED', { phase: 'empty-content' });

    let record: { id: string; status?: string };
    if (input.captionId) {
      record = await this.client.updateCaption(input.captionId, {
        edited_content: input.compiledContent,
        status: 'draft',
      });
      record.id ||= input.captionId;
    } else {
      if (!input.articleId) throw new QuickPublishingError('SOURCE_INVALID');
      record = await this.client.createCaption({
        article_id: input.articleId,
        platform: input.platform === 'threads' ? 'thread' : input.platform,
        ai_content: input.originalContent || input.currentContent,
        edited_content: input.currentContent !== input.originalContent ? input.compiledContent : null,
        ...(input.promptId ? { prompt_id: input.promptId } : {}),
      });
    }
    emit?.({
      type: 'draft-resolved', platform: input.platform, variantId: input.variantId,
      captionId: record.id, status: record.status ?? 'draft',
    });
    return record.id;
  }

  async saveEdit(input: DraftInput, emit?: (event: QuickPublishingEvent) => void) {
    const captionId = await this.ensureDraft(input);
    emit?.({
      type: 'caption-edit-saved', platform: input.platform, variantId: input.variantId,
      captionId, status: 'draft',
    });
    return captionId;
  }

  async regenerateCaption(
    input: RegenerateCaptionInput,
    emit?: (event: QuickPublishingEvent) => void
  ) {
    const { captionId, platform, ...command } = input;
    try {
      const result = await this.client.regenerateCaption(captionId, command);
      emit?.({
        type: 'caption-regenerated', platform, captionId: result.captionId,
        mode: result.mode, content: result.content,
        ...(result.replacementRanges ? { replacementRanges: result.replacementRanges } : {}),
      });
      return result;
    } catch (error) {
      if (error instanceof QuickPublishingError) throw error;
      throw new QuickPublishingError('CAPTION_REGENERATION_FAILED', { platform });
    }
  }

  async schedule(input: ScheduleInput, emit: (event: QuickPublishingEvent) => void) {
    if (input.platforms.length === 0) throw new QuickPublishingError('SCHEDULE_INVALID', { reason: 'empty' });
    const connected = new Set(input.connectedPlatforms);
    const successful: QuickPublishingPlatform[] = [];
    const failed: QuickPublishingPlatform[] = [];

    for (const item of input.platforms) {
      if (!connected.has(item.platform)) {
        throw new QuickPublishingError('PLATFORM_NOT_CONNECTED', { platform: item.platform });
      }
      const scheduledAt = new Date(item.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= this.now().getTime()) {
        throw new QuickPublishingError('SCHEDULE_INVALID', { platform: item.platform });
      }
    }

    await Promise.all(input.platforms.map(async (item) => {
      try {
        const captionId = await this.ensureDraft(item.draft, emit);
        await this.client.schedule({ captionId, scheduledAt: item.scheduledAt, imageUrls: input.imageUrls });
        successful.push(item.platform);
        emit({ type: 'platform-scheduled', platform: item.platform, captionId });
      } catch (error) {
        failed.push(item.platform);
        emit({
          type: 'platform-schedule-failed', platform: item.platform,
          error: toQuickPublishingFailure(error, 'SCHEDULE_FAILED', { platform: item.platform }),
        });
      }
    }));
    emit({ type: 'schedule-completed', successful, failed });
    if (failed.length > 0) throw new QuickPublishingError('SCHEDULE_FAILED', { failed });
    return { successful, failed };
  }

  async publishNow(input: PublishInput, emit: (event: QuickPublishingEvent) => void) {
    if (input.platforms.length === 0) throw new QuickPublishingError('SCHEDULE_INVALID', { reason: 'empty' });
    const connected = new Set(input.connectedPlatforms);
    const successful: QuickPublishingPlatform[] = [];
    const failed: QuickPublishingPlatform[] = [];

    await Promise.all(input.platforms.map(async (item) => {
      try {
        if (!connected.has(item.platform)) {
          throw new QuickPublishingError('PLATFORM_NOT_CONNECTED', { platform: item.platform });
        }
        const captionId = await this.ensureDraft(item.draft, emit);
        await this.client.publishNow({ captionId, imageUrls: input.imageUrls });
        successful.push(item.platform);
        emit({ type: 'platform-published', platform: item.platform, captionId });
      } catch (error) {
        failed.push(item.platform);
        emit({
          type: 'platform-publish-failed', platform: item.platform,
          error: toQuickPublishingFailure(error, 'PUBLISH_FAILED', { platform: item.platform }),
        });
      }
    }));
    emit({ type: 'publish-completed', successful, failed });
    if (failed.length > 0) throw new QuickPublishingError('PUBLISH_FAILED', { failed });
    return { successful, failed };
  }

  private async runGenerationCommand(
    command: GenerateCaptionCommand,
    platform: QuickPublishingPlatform,
    variantId: string,
    variantIndex: number,
    emit: (event: QuickPublishingEvent) => void,
    signal?: AbortSignal
  ) {
    emit({ type: 'generation-started', platform, variantId, variantIndex });
    let accumulated = '';
    try {
      for await (const event of this.client.generate(command, signal)) {
        if (event.type === 'text') {
          accumulated += event.text;
          emit({ type: 'text-fragment', platform, variantId, variantIndex, text: event.text, accumulated });
        } else if (event.type === 'completed') {
          if (event.captionId) emit({ type: 'caption-resolved', platform, variantId, variantIndex, captionId: event.captionId });
          if (event.articleId) emit({ type: 'article-resolved', articleId: event.articleId });
        } else {
          throw new QuickPublishingError('GENERATION_FAILED', { platform, variantId, phase: 'validation' });
        }
      }
      emit({ type: 'generation-completed', platform, variantId, variantIndex, content: accumulated });
    } catch (error) {
      const failure = toQuickPublishingFailure(error, 'GENERATION_FAILED', { platform, variantId });
      if (failure.code === 'GENERATION_ABORTED') {
        emit({ type: 'generation-aborted', platform, variantId, variantIndex });
      } else {
        emit({ type: 'generation-failed', platform, variantId, variantIndex, error: failure });
      }
    }
  }
}

export function selectPreset(presets: QuickPublishingPreset[], savedPresetId?: string) {
  return presets.find((preset) => preset.id === savedPresetId)
    ?? presets.find((preset) => preset.is_default && preset.user_id)
    ?? presets.find((preset) => preset.user_id)
    ?? presets.find((preset) => preset.is_default && !preset.user_id)
    ?? presets[0];
}

export function compileQuickPickInstruction(customText: string, quickPicks: string[]) {
  const labels = quickPicks.map((id) => QUICK_PICK_LABELS[id]).filter(Boolean);
  if (labels.length === 0) return customText.trim();
  const picks = labels.join(', ');
  return customText.trim() ? `${customText.trim()} (Yêu cầu nhanh: ${picks})` : `Yêu cầu nhanh: ${picks}`;
}

export function buildVariantPrompt(basePrompt: string, variantIndex: number, mode: 'generation' | 'regeneration') {
  const addition = (mode === 'regeneration' ? REGENERATION_VARIANT_PROMPTS : GENERATION_VARIANT_PROMPTS)[variantIndex] ?? '';
  return addition ? `${basePrompt}\n\n${addition}` : basePrompt;
}

function buildGenerateCommand(
  input: GenerateBatchInput,
  platform: QuickPublishingPlatform,
  variantIndex: number
): GenerateCaptionCommand {
  const config = input.platformConfigs[platform];
  const configured = compileQuickPickInstruction(config.customText, config.quickPicks);
  const basePrompt = configured || input.basePrompt;
  return {
    ...(input.url?.trim() ? { url: input.url.trim() } : {}),
    ...(input.articleId ? { articleId: input.articleId } : {}),
    customPrompt: buildVariantPrompt(basePrompt, variantIndex, input.mode ?? 'generation'),
    platform,
    variantGroupId: input.variantGroupId,
    variantIndex,
    ...(input.oldCaptionId ? { oldCaptionId: input.oldCaptionId } : {}),
    ...(input.model ? { model: input.model } : {}),
    stylePresetId: config.configId || 'none',
    presetMode: config.presetId ? 'selected' : 'none',
    ...(config.presetId ? { platformPresetId: config.presetId } : {}),
    ...(variantIndex === 0 && input.promptId ? { promptId: input.promptId } : {}),
  };
}
