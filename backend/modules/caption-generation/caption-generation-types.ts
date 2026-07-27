import type { CaptionGenerationInput } from './caption-generation-schemas';

export interface CaptionGenerationActor {
  id: string;
}

export interface ArticleRecord {
  id: string;
  url?: string;
  title?: string;
  description?: string;
  full_text?: string;
  [key: string]: unknown;
}

export interface CrawledArticle {
  url?: string;
  title?: string;
  category?: string;
  description?: string;
  author?: string;
  published_at?: string;
  views?: string;
  images?: unknown[];
  body?: unknown[];
  full_text?: string;
  tags?: unknown[];
  type?: string;
  [key: string]: unknown;
}

export interface PromptRecord {
  id: string;
  name?: string;
  content: string;
  platform?: string;
}

export interface PlatformPresetRecord {
  id: string;
  user_id: string | null;
  platform: string;
  rules: string;
  is_default: boolean;
}

export interface StylePresetRecord {
  id: string;
  rules?: string;
}

export interface OldCaptionRecord {
  prompt_id: string | null;
  platform?: string;
}

export interface CaptionGenerationRepository {
  findArticleById(id: string): Promise<ArticleRecord | null>;
  findArticleByUrl(url: string): Promise<ArticleRecord | null>;
  saveCrawledArticle(existingId: string | null, article: CrawledArticle): Promise<ArticleRecord>;
  findPlatformPresetById(id: string): Promise<PlatformPresetRecord | null>;
  listPlatformPresets(userId: string, platform: string): Promise<PlatformPresetRecord[]>;
  findStylePresetById(id: string): Promise<StylePresetRecord | null>;
  findActivePromptById(id: string): Promise<PromptRecord | null>;
  findOldCaptionById(id: string): Promise<OldCaptionRecord | null>;
  findPromptById(id: string): Promise<PromptRecord | null>;
  saveCaption(input: Record<string, unknown>): Promise<{ id: string }>;
}

export interface ArticleCrawler {
  crawl(url: string): Promise<CrawledArticle>;
}

export interface DefaultPromptSource {
  getThreadsPrompt(article: ArticleRecord): Promise<string>;
}

export interface GeminiCaptionGateway {
  start(input: {
    title: string;
    content: string;
    prompt: string;
    temperature: number;
  }): Promise<AsyncIterable<string>>;
}

export type CaptionGenerationEvent =
  | { type: 'text'; text: string }
  | { type: 'validation-error'; error: string; done: true }
  | {
      type: 'completed';
      done: true;
      captionId: string;
      articleId: string;
      variantGroupId: string | null;
    };

export interface CaptionGenerationSession {
  events: AsyncIterable<CaptionGenerationEvent>;
}

export interface CaptionGenerationModuleInterface {
  generate(
    actor: CaptionGenerationActor,
    input: CaptionGenerationInput
  ): Promise<CaptionGenerationSession>;
}
