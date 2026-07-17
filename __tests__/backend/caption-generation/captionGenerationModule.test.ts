import { describe, expect, it } from 'vitest';
import { CaptionGenerationModule } from '@/backend/modules/caption-generation/caption-generation-module';
import { CaptionGenerationError } from '@/backend/modules/caption-generation/errors';
import type {
  ArticleCrawler,
  ArticleRecord,
  CaptionGenerationEvent,
  CaptionGenerationRepository,
  CrawledArticle,
  DefaultPromptSource,
  GeminiCaptionGateway,
  OldCaptionRecord,
  PlatformPresetRecord,
  PromptRecord,
  StylePresetRecord,
} from '@/backend/modules/caption-generation/caption-generation-types';

class FakeRepository implements CaptionGenerationRepository {
  article: ArticleRecord | null = { id: 'article-1', title: 'Title', full_text: 'Body' };
  articleByUrl: ArticleRecord | null = null;
  platformPreset: PlatformPresetRecord | null = null;
  platformPresets: PlatformPresetRecord[] = [];
  stylePreset: StylePresetRecord | null = null;
  prompt: PromptRecord | null = { id: 'prompt-1', name: 'Prompt', content: 'Instruction', platform: 'facebook' };
  oldCaption: OldCaptionRecord | null = null;
  oldPrompt: PromptRecord | null = null;
  savedArticle: CrawledArticle | null = null;
  savedCaption: Record<string, unknown> | null = null;
  saveCaptionError: unknown = null;

  async findArticleById() { return this.article; }
  async findArticleByUrl() { return this.articleByUrl; }
  async saveCrawledArticle(_existingId: string | null, article: CrawledArticle) {
    this.savedArticle = article;
    return { id: 'crawled-1', ...article } as ArticleRecord;
  }
  async findPlatformPresetById() { return this.platformPreset; }
  async listPlatformPresets() { return this.platformPresets; }
  async findStylePresetById() { return this.stylePreset; }
  async findActivePromptById() { return this.prompt; }
  async findOldCaptionById() { return this.oldCaption; }
  async findPromptById() { return this.oldPrompt; }
  async saveCaption(input: Record<string, unknown>) {
    if (this.saveCaptionError) throw this.saveCaptionError;
    this.savedCaption = input;
    return { id: 'caption-1' };
  }
}

class FakeCrawler implements ArticleCrawler {
  result: CrawledArticle = { title: 'Crawled', full_text: 'Crawled body' };
  async crawl() { return this.result; }
}

class FakeGemini implements GeminiCaptionGateway {
  fragments = ['Generated caption'];
  lastInput: Parameters<GeminiCaptionGateway['start']>[0] | null = null;
  async start(input: Parameters<GeminiCaptionGateway['start']>[0]) {
    this.lastInput = input;
    const fragments = this.fragments;
    return (async function* () {
      for (const fragment of fragments) yield fragment;
    })();
  }
}

class FakeDefaultPrompts implements DefaultPromptSource {
  async getThreadsPrompt() { return 'Threads default instruction'; }
}

function setup() {
  const repository = new FakeRepository();
  const crawler = new FakeCrawler();
  const gemini = new FakeGemini();
  const generator = new CaptionGenerationModule(
    repository,
    crawler,
    gemini,
    new FakeDefaultPrompts()
  );
  return { repository, crawler, gemini, generator };
}

async function collect(events: AsyncIterable<CaptionGenerationEvent>) {
  const result: CaptionGenerationEvent[] = [];
  for await (const event of events) result.push(event);
  return result;
}

describe('CaptionGenerationModule', () => {
  it('generates from an article ID and persists a draft caption', async () => {
    const { generator, repository } = setup();
    const session = await generator.generate(
      { id: 'user-1' },
      { articleId: 'article-1', promptId: 'prompt-1', variantIndex: 0 }
    );
    const events = await collect(session.events);

    expect(events).toEqual([
      { type: 'text', text: 'Generated caption' },
      {
        type: 'completed',
        done: true,
        captionId: 'caption-1',
        articleId: 'article-1',
        variantGroupId: null,
      },
    ]);
    expect(repository.savedCaption).toMatchObject({
      article_id: 'article-1',
      prompt_id: 'prompt-1',
      created_by: 'user-1',
      platform: 'facebook',
      status: 'draft',
      variant_index: 0,
    });
  });

  it('crawls and persists a fresh URL before generation', async () => {
    const { generator, repository } = setup();
    const session = await generator.generate(
      { id: 'user-1' },
      { url: 'https://example.com/article', promptId: 'prompt-1', variantIndex: 0 }
    );
    await collect(session.events);

    expect(repository.savedArticle).toMatchObject({
      url: 'https://example.com/article',
      title: 'Crawled',
    });
    expect(repository.savedCaption).toMatchObject({ article_id: 'crawled-1' });
  });

  it('rejects invalid URLs and listing pages before Gemini starts', async () => {
    const { generator, crawler } = setup();
    await expect(
      generator.generate({ id: 'user-1' }, { url: 'invalid', promptId: 'prompt-1', variantIndex: 0 })
    ).rejects.toMatchObject({ code: 'INVALID_URL', status: 400 });

    crawler.result = { type: 'LISTING' };
    await expect(
      generator.generate(
        { id: 'user-1' },
        { url: 'https://example.com', promptId: 'prompt-1', variantIndex: 0 }
      )
    ).rejects.toMatchObject({ code: 'LISTING_PAGE', status: 400 });
  });

  it('returns not found for an explicit missing prompt', async () => {
    const { generator, repository } = setup();
    repository.prompt = null;
    await expect(
      generator.generate(
        { id: 'user-1' },
        { articleId: 'article-1', promptId: 'missing', variantIndex: 0 }
      )
    ).rejects.toEqual(expect.objectContaining<Partial<CaptionGenerationError>>({
      code: 'PROMPT_NOT_FOUND',
      status: 404,
    }));
  });

  it('selects user default preset before user and system fallbacks', async () => {
    const { generator, repository, gemini } = setup();
    repository.platformPresets = [
      { id: 'system', user_id: null, platform: 'facebook', rules: 'system', is_default: true },
      { id: 'user-first', user_id: 'user-1', platform: 'facebook', rules: 'first', is_default: false },
      { id: 'user-default', user_id: 'user-1', platform: 'facebook', rules: 'preferred', is_default: true },
    ];
    const session = await generator.generate(
      { id: 'user-1' },
      { articleId: 'article-1', promptId: 'prompt-1', platform: 'facebook', variantIndex: 0 }
    );
    await collect(session.events);
    expect(gemini.lastInput?.prompt).toContain('preferred');
  });

  it('omits the Preset section when presetMode is none', async () => {
    const { generator, gemini } = setup();
    const session = await generator.generate(
      { id: 'user-1' },
      {
        articleId: 'article-1',
        platform: 'facebook',
        presetMode: 'none',
        variantIndex: 0,
      }
    );
    await collect(session.events);

    expect(gemini.lastInput?.prompt).not.toContain('Hướng dẫn khai thác nội dung');
    expect(gemini.lastInput?.prompt).not.toContain('Chưa chọn quy chuẩn');
  });

  it('uses an authorized selected Preset for the target platform', async () => {
    const { generator, repository, gemini } = setup();
    repository.platformPreset = {
      id: 'preset-1', user_id: 'user-1', platform: 'facebook', rules: 'Selected rules', is_default: false,
    };
    const session = await generator.generate(
      { id: 'user-1' },
      {
        articleId: 'article-1',
        platform: 'facebook',
        presetMode: 'selected',
        platformPresetId: 'preset-1',
        variantIndex: 0,
      }
    );
    await collect(session.events);

    expect(gemini.lastInput?.prompt).toContain('Selected rules');
  });

  it('rejects selected Presets owned by another user or for another platform', async () => {
    const { generator, repository } = setup();
    repository.platformPreset = {
      id: 'preset-1', user_id: 'user-2', platform: 'facebook', rules: 'Private', is_default: false,
    };
    await expect(generator.generate(
      { id: 'user-1' },
      {
        articleId: 'article-1', platform: 'facebook', presetMode: 'selected',
        platformPresetId: 'preset-1', variantIndex: 0,
      }
    )).rejects.toMatchObject({ code: 'PRESET_NOT_FOUND', status: 404 });

    repository.platformPreset = {
      id: 'preset-1', user_id: null, platform: 'instagram', rules: 'Wrong platform', is_default: false,
    };
    await expect(generator.generate(
      { id: 'user-1' },
      {
        articleId: 'article-1', platform: 'facebook', presetMode: 'selected',
        platformPresetId: 'preset-1', variantIndex: 0,
      }
    )).rejects.toMatchObject({ code: 'PRESET_PLATFORM_MISMATCH', status: 400 });
  });

  it('combines general and platform Brand Style JSON rules', async () => {
    const { generator, repository, gemini } = setup();
    repository.stylePreset = {
      id: 'style-1',
      rules: JSON.stringify({ general: 'Friendly', facebook: 'Short sentences' }),
    };
    const session = await generator.generate(
      { id: 'user-1' },
      {
        articleId: 'article-1',
        promptId: 'prompt-1',
        platform: 'facebook',
        stylePresetId: 'style-1',
        variantIndex: 0,
      }
    );
    await collect(session.events);
    expect(gemini.lastInput?.prompt).toContain('Friendly\n\nShort sentences');
  });

  it('uses the Threads default prompt and persists the normalized platform', async () => {
    const { generator, repository, gemini } = setup();
    repository.prompt = null;
    const session = await generator.generate(
      { id: 'user-1' },
      { articleId: 'article-1', platform: 'threads', variantIndex: 0 }
    );
    await collect(session.events);
    expect(gemini.lastInput?.prompt).toContain('Threads default instruction');
    expect(repository.savedCaption).toMatchObject({ platform: 'thread', prompt_id: null });
  });

  it('emits a validation error and does not persist oversized Threads content', async () => {
    const { generator, repository, gemini } = setup();
    gemini.fragments = ['a'.repeat(501)];
    const session = await generator.generate(
      { id: 'user-1' },
      { articleId: 'article-1', platform: 'threads', variantIndex: 0 }
    );
    const events = await collect(session.events);
    expect(events.at(-1)).toMatchObject({ type: 'validation-error', done: true });
    expect(repository.savedCaption).toBeNull();
  });

  it('uses higher temperature for alternate variants', async () => {
    const { generator, gemini } = setup();
    const session = await generator.generate(
      { id: 'user-1' },
      { articleId: 'article-1', promptId: 'prompt-1', variantIndex: 2 }
    );
    await collect(session.events);
    expect(gemini.lastInput?.temperature).toBe(1);
  });

  it('keeps completion successful with an empty caption ID when saving fails', async () => {
    const { generator, repository } = setup();
    repository.saveCaptionError = new Error('insert failed');
    const session = await generator.generate(
      { id: 'user-1' },
      { articleId: 'article-1', promptId: 'prompt-1', variantIndex: 0 }
    );
    const events = await collect(session.events);
    expect(events.at(-1)).toMatchObject({ type: 'completed', captionId: '' });
  });
});
