import type { SupabaseClient } from '@supabase/supabase-js';
import { GeminiCapacityRepositoryError } from './errors';
import type {
  GeminiCapacityKeyRecord,
  GeminiCapacityKeySummary,
  GeminiCapacityRepository,
} from './gemini-capacity-types';

const SUMMARY_COLUMNS = [
  'id',
  'label',
  'status',
  'rate_limited_until',
  'error_count',
  'last_used_at',
  'created_at',
  'updated_at',
  'key_hint',
].join(',');

export class SupabaseGeminiCapacityRepository implements GeminiCapacityRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async claim(excludedIds: string[]): Promise<GeminiCapacityKeyRecord | null> {
    const { data, error } = await this.supabase
      .rpc('claim_gemini_capacity_key', { p_excluded_ids: excludedIds })
      .maybeSingle();
    if (error) throw this.failure('claim', error);
    return data as GeminiCapacityKeyRecord | null;
  }

  recordSuccess(id: string) {
    return this.updateHealth(id, {
      status: 'active',
      error_count: 0,
      rate_limited_until: null,
    }, 'recordSuccess');
  }

  recordRateLimit(id: string, until: string) {
    return this.incrementFailure(id, {
      status: 'rate_limited',
      rate_limited_until: until,
    }, 'recordRateLimit');
  }

  recordInvalid(id: string) {
    return this.incrementFailure(id, {
      status: 'invalid',
      rate_limited_until: null,
    }, 'recordInvalid');
  }

  async recordTransientFailure(id: string) {
    const record = await this.findErrorCount(id, 'recordTransientFailure');
    await this.updateHealth(id, { error_count: record + 1 }, 'recordTransientFailure');
  }

  async listKeys(): Promise<GeminiCapacityKeySummary[]> {
    const { data, error } = await this.supabase
      .from('gemini_api_keys')
      .select(SUMMARY_COLUMNS)
      .order('created_at', { ascending: false });
    if (error) throw this.failure('listKeys', error);
    return (data ?? []).map(toSummary);
  }

  async createKey(secret: string, label: string): Promise<GeminiCapacityKeySummary> {
    const { data, error } = await this.supabase
      .from('gemini_api_keys')
      .insert({ key_value: secret, label, status: 'active', error_count: 0 })
      .select(SUMMARY_COLUMNS)
      .single();
    if (error) throw this.failure('createKey', error);
    return toSummary(data);
  }

  async updateKey(
    id: string,
    input: { label?: string; status?: 'active' | 'invalid' }
  ): Promise<GeminiCapacityKeySummary | null> {
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.label !== undefined) update.label = input.label;
    if (input.status !== undefined) {
      update.status = input.status;
      update.rate_limited_until = null;
      if (input.status === 'active') update.error_count = 0;
    }

    const { data, error } = await this.supabase
      .from('gemini_api_keys')
      .update(update)
      .eq('id', id)
      .select(SUMMARY_COLUMNS)
      .maybeSingle();
    if (error) throw this.failure('updateKey', error);
    return data ? toSummary(data) : null;
  }

  async deleteKey(id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('gemini_api_keys')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw this.failure('deleteKey', error);
    return Boolean(data);
  }

  private async incrementFailure(
    id: string,
    update: Record<string, unknown>,
    operation: string
  ) {
    const errorCount = await this.findErrorCount(id, operation);
    await this.updateHealth(id, { ...update, error_count: errorCount + 1 }, operation);
  }

  private async findErrorCount(id: string, operation: string) {
    const { data, error } = await this.supabase
      .from('gemini_api_keys')
      .select('error_count')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) throw this.failure(operation, error ?? new Error('Key not found'));
    return Number(data.error_count) || 0;
  }

  private async updateHealth(
    id: string,
    update: Record<string, unknown>,
    operation: string
  ) {
    const { error } = await this.supabase
      .from('gemini_api_keys')
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw this.failure(operation, error);
  }

  private failure(operation: string, cause: unknown) {
    return new GeminiCapacityRepositoryError(operation, cause);
  }
}

type SummaryRow = Omit<GeminiCapacityKeySummary, 'masked_value'> & { key_hint: string };

function toSummary(input: unknown): GeminiCapacityKeySummary {
  const { key_hint, ...summary } = input as SummaryRow;
  return { ...summary, masked_value: key_hint };
}
