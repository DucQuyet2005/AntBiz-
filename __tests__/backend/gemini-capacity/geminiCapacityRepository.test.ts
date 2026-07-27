import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseGeminiCapacityRepository } from '@/backend/modules/gemini-capacity/gemini-capacity-repository';

const KEY_ID = '11111111-1111-4111-8111-111111111111';

function repositoryWith(supabase: unknown) {
  return new SupabaseGeminiCapacityRepository(supabase as SupabaseClient);
}

function summaryRow() {
  return {
    id: KEY_ID,
    label: 'Primary',
    status: 'active',
    rate_limited_until: null,
    error_count: 0,
    last_used_at: null,
    created_at: '2026-07-16T00:00:00.000Z',
    updated_at: '2026-07-16T00:00:00.000Z',
    key_hint: 'AIzaS...secret',
  };
}

describe('SupabaseGeminiCapacityRepository', () => {
  it('claims through the atomic service-role RPC with excluded IDs', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: KEY_ID, key_value: 'secret', status: 'active' },
      error: null,
    });
    const rpc = vi.fn().mockReturnValue({ maybeSingle });

    await expect(repositoryWith({ rpc }).claim(['excluded-id'])).resolves.toMatchObject({
      id: KEY_ID,
      key_value: 'secret',
    });
    expect(rpc).toHaveBeenCalledWith('claim_gemini_capacity_key', {
      p_excluded_ids: ['excluded-id'],
    });
  });

  it('selects summary columns only and maps key_hint to masked_value', async () => {
    const order = vi.fn().mockResolvedValue({ data: [summaryRow()], error: null });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });

    const result = await repositoryWith({ from }).listKeys();

    const selection = String(select.mock.calls[0]?.[0]);
    expect(selection).toContain('key_hint');
    expect(selection).not.toContain('key_value');
    expect(result[0]).toMatchObject({ masked_value: 'AIzaS...secret' });
    expect(result[0]).not.toHaveProperty('key_hint');
  });

  it('uses the secret only as an insert value and returns a non-secret projection', async () => {
    const single = vi.fn().mockResolvedValue({ data: summaryRow(), error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });

    const result = await repositoryWith({ from }).createKey('raw-secret', 'Primary');

    expect(insert).toHaveBeenCalledWith({
      key_value: 'raw-secret',
      label: 'Primary',
      status: 'active',
      error_count: 0,
    });
    expect(String(select.mock.calls[0]?.[0])).not.toContain('key_value');
    expect(result).not.toHaveProperty('key_value');
  });

  it('resets health when an administrator activates a key', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: summaryRow(), error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });

    await repositoryWith({ from }).updateKey(KEY_ID, { status: 'active' });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'active',
      error_count: 0,
      rate_limited_until: null,
    }));
  });

  it('sanitizes claim failures behind the repository error', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'raw database detail' },
    });
    const rpc = vi.fn().mockReturnValue({ maybeSingle });

    await expect(repositoryWith({ rpc }).claim([])).rejects.toMatchObject({
      name: 'GeminiCapacityRepositoryError',
      operation: 'claim',
    });
  });
});
