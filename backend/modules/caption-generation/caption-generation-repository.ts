import type { SupabaseClient } from '@supabase/supabase-js';
import { CaptionGenerationRepositoryError } from './errors';
import type {
  ArticleRecord,
  CaptionGenerationRepository,
  CrawledArticle,
  OldCaptionRecord,
  PlatformPresetRecord,
  PromptRecord,
  StylePresetRecord,
} from './caption-generation-types';

export class SupabaseCaptionGenerationRepository implements CaptionGenerationRepository {
  constructor(
    private readonly userClient: SupabaseClient,
    private readonly serviceClient: SupabaseClient
  ) {}

  async findArticleById(id: string) {
    const { data, error } = await this.userClient.from('articles').select('*').eq('id', id).maybeSingle();
    if (error) throw new CaptionGenerationRepositoryError('findArticleById', error);
    return data as ArticleRecord | null;
  }

  async findArticleByUrl(url: string) {
    const { data, error } = await this.userClient.from('articles').select('*').eq('url', url).maybeSingle();
    if (error) throw new CaptionGenerationRepositoryError('findArticleByUrl', error);
    return data as ArticleRecord | null;
  }

  async saveCrawledArticle(existingId: string | null, article: CrawledArticle) {
    const payload = {
      url: article.url || '',
      title: article.title || '',
      category: article.category || '',
      description: article.description || '',
      author: article.author || '',
      published_at: article.published_at || '',
      views: article.views || '',
      images: article.images || [],
      body: article.body || [],
      full_text: article.full_text || '',
      tags: article.tags || [],
      crawled_at: new Date().toISOString(),
    };

    const query = existingId
      ? this.serviceClient.from('articles').update(payload).eq('id', existingId)
      : this.serviceClient.from('articles').insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw new CaptionGenerationRepositoryError('saveCrawledArticle', error);
    return data as ArticleRecord;
  }

  async findPlatformPresetById(id: string) {
    const { data, error } = await this.serviceClient
      .from('platform_presets')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new CaptionGenerationRepositoryError('findPlatformPresetById', error);
    return data as PlatformPresetRecord | null;
  }

  async listPlatformPresets(userId: string, platform: string) {
    const { data, error } = await this.serviceClient
      .from('platform_presets')
      .select('*')
      .eq('platform', platform);
    if (error) throw new CaptionGenerationRepositoryError('listPlatformPresets', error);
    return (data ?? []) as PlatformPresetRecord[];
  }

  async findStylePresetById(id: string) {
    const { data } = await this.userClient
      .from('prompt_configs')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return data as StylePresetRecord | null;
  }

  async findActivePromptById(id: string) {
    const { data, error } = await this.userClient
      .from('prompts')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();
    if (error) throw new CaptionGenerationRepositoryError('findActivePromptById', error);
    return data as PromptRecord | null;
  }

  async findOldCaptionById(id: string) {
    const { data, error } = await this.userClient
      .from('captions')
      .select('prompt_id, platform')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new CaptionGenerationRepositoryError('findOldCaptionById', error);
    return data as OldCaptionRecord | null;
  }

  async findPromptById(id: string) {
    const { data, error } = await this.userClient
      .from('prompts')
      .select('id, name, content, platform')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new CaptionGenerationRepositoryError('findPromptById', error);
    return data as PromptRecord | null;
  }

  async saveCaption(input: Record<string, unknown>) {
    const { data, error } = await this.userClient
      .from('captions')
      .insert(input)
      .select()
      .single();
    if (error) throw new CaptionGenerationRepositoryError('saveCaption', error);
    return data as { id: string };
  }
}
