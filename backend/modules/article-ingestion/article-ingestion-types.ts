import type { ManualArticleInput } from './article-ingestion-schemas';

export interface IngestedImage { url: string; [key: string]: unknown }
export interface ArticleSourceResult {
  type: 'ARTICLE' | 'LISTING';
  url: string;
  title?: string;
  description?: string;
  author?: string;
  category?: string;
  images?: IngestedImage[];
  tags?: string[];
  body?: unknown[];
  full_text?: string;
  published_at?: string;
  views?: string;
  author_image_url?: string;
  extractedUrls?: unknown[];
  warning?: string;
}

export interface ArticleSource {
  isSafe(url: string): Promise<boolean>;
  crawl(url: string): Promise<ArticleSourceResult>;
}

export interface ArticleRecord { id: string; [key: string]: unknown }

export interface ArticleIngestionRepository {
  findExact(url: string): Promise<ArticleRecord | null>;
  findPrefix(url: string): Promise<ArticleRecord | null>;
  update(id: string, input: Record<string, unknown>): Promise<{ id: string }>;
  insert(input: Record<string, unknown>): Promise<{ id: string }>;
}

export interface ArticleIngestionModuleInterface {
  ingestUrl(url: string): Promise<Record<string, unknown>>;
  createManual(input: ManualArticleInput): Promise<Record<string, unknown>>;
}
