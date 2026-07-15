import type { SupabaseClient } from '@supabase/supabase-js';
import { LandingConfigurationRepositoryError } from './errors';
import type {
  LandingConfigurationEntry,
  LandingConfigurationHistoryRecord,
  LandingConfigurationRepository,
  LandingConfigurationSnapshot,
} from './landing-configuration-types';

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
const HISTORY_SELECTION = 'id, note, created_at, created_by, config_snapshot, users(email)';

export class SupabaseLandingConfigurationRepository implements LandingConfigurationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listEntries(): Promise<LandingConfigurationEntry[]> {
    const { data, error } = await this.supabase
      .from('landing_page_config')
      .select('*')
      .order('section')
      .order('key');
    if (error) throw this.failure('listEntries', error);
    return (data ?? []) as LandingConfigurationEntry[];
  }

  async upsertEntry(input: {
    section: string;
    key: string;
    value: LandingConfigurationEntry['value'];
    updatedBy: string;
  }): Promise<LandingConfigurationEntry> {
    const { data, error } = await this.supabase
      .from('landing_page_config')
      .upsert({
        section: input.section,
        key: input.key,
        value: input.value,
        updated_by: input.updatedBy,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'section,key' })
      .select()
      .single();
    if (error) throw this.failure('upsertEntry', error);
    return data as LandingConfigurationEntry;
  }

  async clearEntries(): Promise<void> {
    const { error } = await this.supabase
      .from('landing_page_config')
      .delete()
      .neq('id', ZERO_UUID);
    if (error) throw this.failure('clearEntries', error);
  }

  async findLatestHistory(): Promise<LandingConfigurationHistoryRecord | null> {
    const { data, error } = await this.supabase
      .from('landing_page_history')
      .select(HISTORY_SELECTION)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw this.failure('findLatestHistory', error);
    return data ? normalizeHistoryRecord(data) : null;
  }

  async listHistory(limit: number): Promise<LandingConfigurationHistoryRecord[]> {
    const { data, error } = await this.supabase
      .from('landing_page_history')
      .select(HISTORY_SELECTION)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw this.failure('listHistory', error);
    return (data ?? []).map(normalizeHistoryRecord);
  }

  async createHistory(input: {
    snapshot: LandingConfigurationSnapshot;
    note: string;
    createdBy: string;
  }): Promise<LandingConfigurationHistoryRecord> {
    const { data, error } = await this.supabase
      .from('landing_page_history')
      .insert({
        config_snapshot: input.snapshot,
        note: input.note,
        created_by: input.createdBy,
      })
      .select()
      .single();
    if (error) throw this.failure('createHistory', error);
    return normalizeHistoryRecord(data);
  }

  async findHistoryById(id: string): Promise<LandingConfigurationHistoryRecord | null> {
    const { data, error } = await this.supabase
      .from('landing_page_history')
      .select(HISTORY_SELECTION)
      .eq('id', id)
      .maybeSingle();
    if (error) throw this.failure('findHistoryById', error);
    return data ? normalizeHistoryRecord(data) : null;
  }

  async updateHistoryNote(id: string, note: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('landing_page_history')
      .update({ note })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw this.failure('updateHistoryNote', error);
    return Boolean(data);
  }

  async deleteHistory(id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('landing_page_history')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw this.failure('deleteHistory', error);
    return Boolean(data);
  }

  async replaceEntries(snapshot: LandingConfigurationSnapshot): Promise<void> {
    const { error } = await this.supabase.rpc('replace_landing_page_config', {
      p_snapshot: snapshot,
    });
    if (error) throw this.failure('replaceEntries', error);
  }

  private failure(operation: string, error: unknown) {
    return new LandingConfigurationRepositoryError(operation, error);
  }
}

type RawHistoryRecord = Omit<LandingConfigurationHistoryRecord, 'users'> & {
  users?: { email: string | null } | Array<{ email: string | null }> | null;
};

function normalizeHistoryRecord(input: unknown): LandingConfigurationHistoryRecord {
  const record = input as RawHistoryRecord;
  return {
    ...record,
    users: Array.isArray(record.users) ? record.users[0] ?? null : record.users ?? null,
  };
}
