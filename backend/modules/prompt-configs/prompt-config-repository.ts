import type { SupabaseClient } from '@supabase/supabase-js';
import { PromptConfigRepositoryError } from './errors';
import type {
  PromptConfigRecord,
  PromptConfigRepository,
} from './prompt-config-types';
import type {
  CreatePromptConfigInput,
  UpdatePromptConfigInput,
} from './prompt-config-schemas';

export class SupabasePromptConfigRepository implements PromptConfigRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(userId: string, platform?: string): Promise<PromptConfigRecord[]> {
    let query = this.supabase
      .from('prompt_configs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (platform) query = query.eq('platform', platform);

    const { data, error } = await query;
    if (error) throw new PromptConfigRepositoryError('list', error);
    return (data ?? []) as PromptConfigRecord[];
  }

  async findById(id: string): Promise<PromptConfigRecord | null> {
    const { data, error } = await this.supabase
      .from('prompt_configs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new PromptConfigRepositoryError('findById', error);
    return data as PromptConfigRecord | null;
  }

  async findDuplicateName(
    userId: string,
    name: string,
    excludeId?: string
  ): Promise<PromptConfigRecord | null> {
    let query = this.supabase
      .from('prompt_configs')
      .select('id')
      .eq('user_id', userId)
      .eq('name', name);

    if (excludeId) query = query.neq('id', excludeId);

    const { data, error } = await query.maybeSingle();
    if (error) throw new PromptConfigRepositoryError('findDuplicateName', error);
    return data as PromptConfigRecord | null;
  }

  async resetDefaults(userId: string, excludeId?: string): Promise<void> {
    let query = this.supabase
      .from('prompt_configs')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);

    if (excludeId) query = query.neq('id', excludeId);

    const { error } = await query;
    if (error) throw new PromptConfigRepositoryError('resetDefaults', error);
  }

  async create(
    input: CreatePromptConfigInput & Record<string, unknown>
  ): Promise<PromptConfigRecord> {
    const { data, error } = await this.supabase
      .from('prompt_configs')
      .insert(input)
      .select()
      .single();

    if (error) throw new PromptConfigRepositoryError('create', error);
    return data as PromptConfigRecord;
  }

  async update(
    id: string,
    input: UpdatePromptConfigInput & Record<string, unknown>
  ): Promise<PromptConfigRecord> {
    const { data, error } = await this.supabase
      .from('prompt_configs')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new PromptConfigRepositoryError('update', error);
    return data as PromptConfigRecord;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('prompt_configs')
      .delete()
      .eq('id', id);

    if (error) throw new PromptConfigRepositoryError('delete', error);
  }

  async findDefault(userId: string): Promise<PromptConfigRecord | null> {
    const { data, error } = await this.supabase
      .from('prompt_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle();

    if (error) throw new PromptConfigRepositoryError('findDefault', error);
    return data as PromptConfigRecord | null;
  }
}

