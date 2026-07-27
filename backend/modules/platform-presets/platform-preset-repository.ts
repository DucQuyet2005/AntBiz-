import type { SupabaseClient } from '@supabase/supabase-js';
import { PlatformPresetRepositoryError } from './errors';
import type {
  PlatformPresetRecord,
  PlatformPresetRepository,
} from './platform-preset-types';
import type {
  CreatePlatformPresetInput,
  UpdatePlatformPresetInput,
} from './platform-preset-schemas';

export class SupabasePlatformPresetRepository implements PlatformPresetRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listAllPresets(platform: string): Promise<PlatformPresetRecord[]> {
    const { data, error } = await this.supabase
      .from('platform_presets')
      .select('*')
      .eq('platform', platform);

    if (error) throw new PlatformPresetRepositoryError('listAllPresets', error);
    return (data ?? []) as PlatformPresetRecord[];
  }

  async listUserPresets(userId: string, platform: string): Promise<PlatformPresetRecord[]> {
    const { data, error } = await this.supabase
      .from('platform_presets')
      .select('*')
      .eq('platform', platform)
      .eq('user_id', userId);

    if (error) throw new PlatformPresetRepositoryError('listUserPresets', error);
    return (data ?? []) as PlatformPresetRecord[];
  }

  async listSystemPresets(platform: string): Promise<PlatformPresetRecord[]> {
    const { data, error } = await this.supabase
      .from('platform_presets')
      .select('*')
      .eq('platform', platform)
      .is('user_id', null);

    if (error) throw new PlatformPresetRepositoryError('listSystemPresets', error);
    return (data ?? []) as PlatformPresetRecord[];
  }

  async cloneForUser(
    presets: Array<Omit<PlatformPresetRecord, 'id' | 'created_at'>>
  ): Promise<PlatformPresetRecord[]> {
    const { data, error } = await this.supabase
      .from('platform_presets')
      .insert(presets)
      .select();

    if (error) throw new PlatformPresetRepositoryError('cloneForUser', error);
    return (data ?? []) as PlatformPresetRecord[];
  }

  async resetDefaults(userId: string, platform: string): Promise<void> {
    const { error } = await this.supabase
      .from('platform_presets')
      .update({ is_default: false })
      .eq('platform', platform);

    if (error) throw new PlatformPresetRepositoryError('resetDefaults', error);
  }

  async upsert(
    input: CreatePlatformPresetInput & Record<string, unknown>
  ): Promise<PlatformPresetRecord> {
    const { data, error } = await this.supabase
      .from('platform_presets')
      .insert(input)
      .select()
      .single();

    if (error) throw new PlatformPresetRepositoryError('upsert', error);
    return data as PlatformPresetRecord;
  }

  async findById(id: string): Promise<PlatformPresetRecord | null> {
    const { data, error } = await this.supabase
      .from('platform_presets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new PlatformPresetRepositoryError('findById', error);
    return data as PlatformPresetRecord | null;
  }

  async update(
    id: string,
    input: UpdatePlatformPresetInput & Record<string, unknown>
  ): Promise<PlatformPresetRecord> {
    const { data, error } = await this.supabase
      .from('platform_presets')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new PlatformPresetRepositoryError('update', error);
    return data as PlatformPresetRecord;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('platform_presets')
      .delete()
      .eq('id', id);

    if (error) throw new PlatformPresetRepositoryError('delete', error);
  }
}
