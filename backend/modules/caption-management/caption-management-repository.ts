import type { SupabaseClient } from '@supabase/supabase-js';
import { CaptionManagementRepositoryError } from './errors';
import type {
  CaptionListQuery,
  CaptionManagementRepository,
  CaptionMutationRecord,
  CaptionRecord,
  CaptionVersionRecord,
} from './caption-management-types';

export class SupabaseCaptionManagementRepository implements CaptionManagementRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async createCaption(input: Record<string, unknown>) {
    const { data, error } = await this.supabase.from('captions').insert(input).select().single();
    if (error) throw new CaptionManagementRepositoryError('createCaption', error);
    return data as CaptionRecord;
  }

  async linkDraftVersions(articleId: string, platform: string, captionId: string) {
    const { error } = await this.supabase
      .from('caption_versions')
      .update({ caption_id: captionId })
      .eq('article_id', articleId)
      .eq('platform', platform)
      .is('caption_id', null);
    if (error) throw new CaptionManagementRepositoryError('linkDraftVersions', error);
  }

  async listCaptions(input: CaptionListQuery) {
    let query = this.supabase.from('captions').select(`
      id,
      platform,
      ai_content,
      edited_content,
      status,
      is_favorite_template,
      created_at,
      updated_at,
      article_id,
      articles!inner (id, title, url),
      prompt_id,
      prompts (id, name)
    `, { count: 'exact' });

    if (input.platform) query = query.eq('platform', input.platform);
    if (input.search) {
      const pattern = `%${input.search}%`;
      query = query.or(`ai_content.ilike.${pattern},edited_content.ilike.${pattern},articles.title.ilike.${pattern}`);
    }
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(input.from, input.to);
    if (error) throw new CaptionManagementRepositoryError('listCaptions', error);
    return { data: (data ?? []) as CaptionRecord[], count: count ?? 0 };
  }

  async findCaptionById(id: string) {
    const { data, error } = await this.supabase.from('captions').select('*').eq('id', id).maybeSingle();
    if (error) throw new CaptionManagementRepositoryError('findCaptionById', error);
    return data as CaptionRecord | null;
  }

  async findCaptionForMutation(id: string) {
    const { data, error } = await this.supabase
      .from('captions')
      .select('id, created_by, ai_content, edited_content, status')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new CaptionManagementRepositoryError('findCaptionForMutation', error);
    return data as CaptionMutationRecord | null;
  }

  async updateCaption(id: string, input: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('captions')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new CaptionManagementRepositoryError('updateCaption', error);
    return data as CaptionRecord;
  }

  async latestVersionForCaption(captionId: string) {
    const { data, error } = await this.supabase
      .from('caption_versions')
      .select('version_number')
      .eq('caption_id', captionId)
      .order('version_number', { ascending: false })
      .limit(1);
    if (error) throw new CaptionManagementRepositoryError('latestVersionForCaption', error);
    return data?.[0]?.version_number ?? null;
  }

  async latestVersionForArticlePlatform(articleId: string, platform: string) {
    const { data, error } = await this.supabase
      .from('caption_versions')
      .select('version_number')
      .eq('article_id', articleId)
      .eq('platform', platform)
      .order('version_number', { ascending: false })
      .limit(1);
    if (error) throw new CaptionManagementRepositoryError('latestVersionForArticlePlatform', error);
    return data?.[0]?.version_number ?? null;
  }

  async insertVersion(input: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('caption_versions')
      .insert(input)
      .select()
      .single();
    if (error) throw new CaptionManagementRepositoryError('insertVersion', error);
    return data as CaptionVersionRecord;
  }
}
