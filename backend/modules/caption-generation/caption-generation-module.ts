import { validateThreadsLength } from '@/lib/validations/threads';
import { buildCaptionPrompt } from './caption-prompt-builder';
import { CaptionGenerationError, CaptionGenerationRepositoryError } from './errors';
import type { CaptionGenerationInput } from './caption-generation-schemas';
import type {
  ArticleCrawler,
  ArticleRecord,
  CaptionGenerationActor,
  CaptionGenerationEvent,
  CaptionGenerationModuleInterface,
  CaptionGenerationRepository,
  CaptionGenerationSession,
  DefaultPromptSource,
  GeminiCaptionGateway,
  PlatformPresetRecord,
} from './caption-generation-types';

export class CaptionGenerationModule implements CaptionGenerationModuleInterface {
  constructor(
    private readonly repository: CaptionGenerationRepository,
    private readonly crawler: ArticleCrawler,
    private readonly gemini: GeminiCaptionGateway,
    private readonly defaultPrompts: DefaultPromptSource
  ) {}

  async generate(
    actor: CaptionGenerationActor,
    input: CaptionGenerationInput
  ): Promise<CaptionGenerationSession> {
    const article = await this.resolveArticle(input);
    const platformRules = await this.resolvePlatformRules(actor.id, input);
    const styleContent = await this.resolveStyle(input);
    const instruction = await this.resolveInstruction(article, input);

    if (input.oldCaptionId) {
      await this.logRegenerationComparison(input.oldCaptionId, instruction.content, instruction.id, instruction.name);
    }

    const targetPlatform = instruction.platform || input.platform;
    const fullText = String(article.full_text || article.description || '');
    const prompt = buildCaptionPrompt({
      article,
      platform: input.platform,
      platformRules,
      instruction: instruction.content,
      styleContent,
    });

    let fragments: AsyncIterable<string>;
    try {
      fragments = await this.gemini.start({
        title: String(article.title || ''),
        content: fullText,
        prompt,
        temperature: input.variantIndex >= 1 ? 1 : 0.7,
      });
    } catch (error) {
      throw new CaptionGenerationError(
        'GENERATION_FAILED',
        500,
        error instanceof Error ? error.message : 'Không thể khởi tạo Gemini',
        error
      );
    }

    return {
      events: this.streamEvents(actor, input, article, targetPlatform, instruction.id, fragments),
    };
  }

  private async resolveArticle(input: CaptionGenerationInput): Promise<ArticleRecord> {
    if (input.articleId) {
      try {
        const article = await this.repository.findArticleById(input.articleId);
        if (article) return article;
      } catch (error) {
        throw new CaptionGenerationError(
          'ARTICLE_READ_FAILED',
          500,
          'Không thể tải bài viết từ database',
          error,
          { articleId: input.articleId }
        );
      }
      throw new CaptionGenerationError('ARTICLE_NOT_FOUND', 404, 'Không tìm thấy bài viết');
    }

    const url = input.url as string;
    try {
      new URL(url);
    } catch {
      throw new CaptionGenerationError('INVALID_URL', 400, 'URL không hợp lệ');
    }

    let crawled;
    try {
      crawled = await this.crawler.crawl(url);
    } catch (error) {
      throw new CaptionGenerationError(
        'CRAWLER_FAILED',
        500,
        'Không thể cào và tiền xử lý dữ liệu bài viết',
        error,
        { url }
      );
    }

    if (crawled.type === 'LISTING') {
      throw new CaptionGenerationError(
        'LISTING_PAGE',
        400,
        'Đây là trang danh sách liên kết (LISTING), vui lòng chọn một bài viết cụ thể để tạo caption.'
      );
    }

    let existing: ArticleRecord | null = null;
    try {
      existing = await this.repository.findArticleByUrl(url);
      return await this.repository.saveCrawledArticle(existing?.id || null, {
        ...crawled,
        url: crawled.url || url,
      });
    } catch (error) {
      const operation = error instanceof CaptionGenerationRepositoryError ? error.operation : '';
      const message = operation === 'findArticleByUrl'
        ? 'Không thể tải bài viết từ database'
        : existing
          ? 'Không thể cập nhật bài viết vào database'
          : 'Không thể lưu bài viết vào database';
      throw new CaptionGenerationError('ARTICLE_WRITE_FAILED', 500, message, error, { url });
    }
  }

  private async resolvePlatformRules(actorId: string, input: CaptionGenerationInput) {
    if (input.platformPresetId) {
      const explicit = await this.repository.findPlatformPresetById(input.platformPresetId);
      if (explicit?.rules) return explicit.rules;
    }

    if (!input.platform) return '';
    const platform = normalizePlatform(input.platform);
    const presets = await this.repository.listPlatformPresets(actorId, platform);
    const selected = selectPlatformPreset(presets, actorId);
    return selected?.rules || '';
  }

  private async resolveStyle(input: CaptionGenerationInput) {
    if (!input.stylePresetId || input.stylePresetId === 'none') return '';
    const style = await this.repository.findStylePresetById(input.stylePresetId);
    if (!style?.rules) return '';

    try {
      if (!style.rules.trim().startsWith('{')) return style.rules;
      const rules = JSON.parse(style.rules) as Record<string, unknown>;
      let content = typeof rules.general === 'string' ? rules.general : '';
      const platformKey = input.platform === 'threads' ? 'threads' : input.platform;
      if (platformKey && typeof rules[platformKey] === 'string') {
        content += `${content ? '\n\n' : ''}${rules[platformKey]}`;
      }
      return content;
    } catch {
      return style.rules;
    }
  }

  private async resolveInstruction(article: ArticleRecord, input: CaptionGenerationInput) {
    if (input.promptId) {
      const prompt = await this.repository.findActivePromptById(input.promptId);
      if (!prompt) {
        throw new CaptionGenerationError('PROMPT_NOT_FOUND', 404, 'Không tìm thấy prompt');
      }
      return {
        id: prompt.id,
        name: prompt.name || 'N/A',
        content: prompt.content,
        platform: prompt.platform,
      };
    }

    if (input.customPrompt) {
      return { id: null, name: 'Custom', content: input.customPrompt, platform: input.platform };
    }

    if (input.platform === 'threads' || input.platform === 'thread') {
      try {
        return {
          id: null,
          name: 'Threads System',
          content: await this.defaultPrompts.getThreadsPrompt(article),
          platform: input.platform,
        };
      } catch (error) {
        console.error('[Generate API] Error reading Threads default prompt:', error);
      }
    }

    return { id: null, name: 'N/A', content: '', platform: input.platform };
  }

  private async logRegenerationComparison(
    oldCaptionId: string,
    newContent: string,
    newPromptId: string | null,
    newPromptName: string
  ) {
    try {
      const oldCaption = await this.repository.findOldCaptionById(oldCaptionId);
      if (!oldCaption) return;
      const oldPrompt = oldCaption.prompt_id
        ? await this.repository.findPromptById(oldCaption.prompt_id)
        : null;
      const same = newPromptId && oldCaption.prompt_id
        ? newPromptId === oldCaption.prompt_id
        : !newPromptId && !oldCaption.prompt_id && newContent.trim() === (oldPrompt?.content || '').trim();
      console.log('[Generate API] Caption regeneration prompt comparison:', {
        oldCaptionId,
        platform: oldCaption.platform,
        same,
        oldPromptId: oldCaption.prompt_id,
        oldPromptName: oldPrompt?.name || 'N/A',
        newPromptId,
        newPromptName,
      });
    } catch (error) {
      console.error('[Generate API] Error comparing prompts:', error);
    }
  }

  private async *streamEvents(
    actor: CaptionGenerationActor,
    input: CaptionGenerationInput,
    article: ArticleRecord,
    targetPlatform: string | undefined,
    promptId: string | null,
    fragments: AsyncIterable<string>
  ): AsyncIterable<CaptionGenerationEvent> {
    let generatedText = '';
    for await (const fragment of fragments) {
      generatedText += fragment;
      yield { type: 'text', text: fragment };
    }

    if (targetPlatform === 'threads' || targetPlatform === 'thread') {
      const validation = validateThreadsLength(generatedText);
      if (!validation.isValid) {
        yield {
          type: 'validation-error',
          error: `Độ dài nội dung Threads (${validation.length} ký tự) vượt quá giới hạn 500 ký tự.`,
          done: true,
        };
        return;
      }
    }

    if (targetPlatform === 'instagram' && generatedText.length > 2200) {
      yield {
        type: 'validation-error',
        error: `Độ dài nội dung Instagram (${generatedText.length} ký tự) vượt quá giới hạn 2200 ký tự.`,
        done: true,
      };
      return;
    }

    let captionId = '';
    if (generatedText) {
      try {
        const now = new Date().toISOString();
        const payload: Record<string, unknown> = {
          article_id: article.id,
          prompt_id: promptId,
          created_by: actor.id,
          platform: normalizePlatform(targetPlatform),
          ai_content: generatedText,
          status: 'draft',
          variant_index: input.variantIndex,
          created_at: now,
          updated_at: now,
        };
        if (input.variantGroupId) payload.variant_group_id = input.variantGroupId;
        captionId = (await this.repository.saveCaption(payload)).id;
      } catch (error) {
        console.error('[Generate API] Lỗi khi tự động lưu caption sau khi sinh:', error);
      }
    }

    yield {
      type: 'completed',
      done: true,
      captionId,
      articleId: article.id,
      variantGroupId: input.variantGroupId || null,
    };
  }
}

function normalizePlatform(platform: string): string;
function normalizePlatform(platform?: string): string | undefined;
function normalizePlatform(platform?: string) {
  return platform === 'threads' ? 'thread' : platform;
}

function selectPlatformPreset(presets: PlatformPresetRecord[], userId: string) {
  return presets.find((preset) => preset.user_id === userId && preset.is_default)
    || presets.find((preset) => preset.user_id === userId)
    || presets.find((preset) => !preset.user_id && preset.is_default)
    || presets.find((preset) => !preset.user_id);
}
