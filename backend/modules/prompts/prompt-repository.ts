import type { SupabaseClient } from '@supabase/supabase-js';
import { PromptRepositoryError } from './errors';
import type {
  PromptListInput,
  PromptListResult,
  PromptRecord,
  PromptRepository,
} from './prompt-types';
import type { CreatePromptInput, UpdatePromptInput } from './prompt-schemas';

export class SupabasePromptRepository implements PromptRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(input: PromptListInput, ownerId?: string): Promise<PromptListResult> {
    let query = this.supabase
      .from('prompts')
      .select('*', { count: 'exact' })
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (ownerId) query = query.eq('created_by', ownerId);
    if (input.platform) query = query.eq('platform', input.platform);

    if (input.tags) {
      const tags = input.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
      if (tags.length > 0) query = query.contains('tags', tags);
    }

    if (input.search) query = query.ilike('name', `%${input.search}%`);

    const from = (input.page - 1) * input.pageSize;
    const to = from + input.pageSize - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) throw new PromptRepositoryError('list', error);
    return { data: (data ?? []) as PromptRecord[], total: count ?? 0 };
  }

  async clearDefaults(ownerId: string, platform: string): Promise<void> {
    await this.supabase
      .from('prompts')
      .update({ is_default: false })
      .eq('created_by', ownerId)
      .eq('platform', platform)
      .eq('is_deleted', false);
  }

  async create(input: CreatePromptInput & Record<string, unknown>): Promise<PromptRecord> {
    const { data, error } = await this.supabase
      .from('prompts')
      .insert(input)
      .select()
      .single();

    if (error) throw new PromptRepositoryError('create', error);
    return data as PromptRecord;
  }

  async findActiveById(id: string): Promise<PromptRecord | null> {
    const { data, error } = await this.supabase
      .from('prompts')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) throw new PromptRepositoryError('findActiveById', error);
    return data as PromptRecord | null;
  }

  async updateActive(id: string, input: UpdatePromptInput): Promise<PromptRecord | null> {
    const { data, error } = await this.supabase
      .from('prompts')
      .update(input)
      .eq('id', id)
      .eq('is_deleted', false)
      .select()
      .maybeSingle();

    if (error) throw new PromptRepositoryError('updateActive', error);
    return data as PromptRecord | null;
  }

  async softDelete(id: string): Promise<{ id: string } | null> {
    const { data, error } = await this.supabase
      .from('prompts')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('is_deleted', false)
      .select('id')
      .maybeSingle();

    if (error) throw new PromptRepositoryError('softDelete', error);
    return data as { id: string } | null;
  }

  async getUsageCount(id: string): Promise<number | null> {
    const { data, error } = await this.supabase
      .from('prompts')
      .select('usage_count')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data.usage_count ?? 0;
  }

  async setUsageCount(id: string, count: number): Promise<void> {
    const { error } = await this.supabase
      .from('prompts')
      .update({ usage_count: count })
      .eq('id', id);

    if (error) throw new PromptRepositoryError('setUsageCount', error);
  }

  async findCaptionIdsByPrompt(id: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('captions')
      .select('id')
      .eq('prompt_id', id);

    if (error) throw new PromptRepositoryError('findCaptionIdsByPrompt', error);
    return (data ?? []).map((row) => row.id);
  }

  async findScheduledCaptionIds(statuses: string[]): Promise<Array<string | null>> {
    const { data, error } = await this.supabase
      .from('scheduled_posts')
      .select('caption_id')
      .in('status', statuses);

    if (error) throw new PromptRepositoryError('findScheduledCaptionIds', error);
    return (data ?? []).map((row) => row.caption_id ?? null);
  }

  async findDefault(ownerId: string, platform: string): Promise<PromptRecord | null> {
    const { data, error } = await this.supabase
      .from('prompts')
      .select('*')
      .eq('created_by', ownerId)
      .eq('platform', platform)
      .eq('is_default', true)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) throw new PromptRepositoryError('findDefault', error);
    return data as PromptRecord | null;
  }

  async findOldest(ownerId: string, platform: string): Promise<PromptRecord | null> {
    const { data, error } = await this.supabase
      .from('prompts')
      .select('*')
      .eq('created_by', ownerId)
      .eq('platform', platform)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw new PromptRepositoryError('findOldest', error);
    return data as PromptRecord | null;
  }
}

