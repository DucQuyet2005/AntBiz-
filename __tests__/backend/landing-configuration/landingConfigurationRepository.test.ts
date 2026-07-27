import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseLandingConfigurationRepository } from '@/backend/modules/landing-configuration/landing-configuration-repository';

function repositoryWith(supabase: unknown) {
  return new SupabaseLandingConfigurationRepository(supabase as SupabaseClient);
}

describe('SupabaseLandingConfigurationRepository', () => {
  it('lists live entries in deterministic Section/Key order', async () => {
    const secondOrder = vi.fn().mockResolvedValue({ data: [{ id: 'config-1' }], error: null });
    const firstOrder = vi.fn().mockReturnValue({ order: secondOrder });
    const select = vi.fn().mockReturnValue({ order: firstOrder });
    const from = vi.fn().mockReturnValue({ select });

    await expect(repositoryWith({ from }).listEntries()).resolves.toEqual([{ id: 'config-1' }]);
    expect(from).toHaveBeenCalledWith('landing_page_config');
    expect(firstOrder).toHaveBeenCalledWith('section');
    expect(secondOrder).toHaveBeenCalledWith('key');
  });

  it('upserts on the database-enforced Section/Key identity', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'config-1' }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const upsert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ upsert });

    await repositoryWith({ from }).upsertEntry({
      section: 'hero',
      key: 'title',
      value: 'AntBiz',
      updatedBy: 'admin-1',
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        section: 'hero',
        key: 'title',
        value: 'AntBiz',
        updated_by: 'admin-1',
      }),
      { onConflict: 'section,key' }
    );
  });

  it('normalizes Supabase relation arrays in history projections', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'history-1',
        config_snapshot: {},
        note: null,
        created_by: 'admin-1',
        created_at: null,
        users: [{ email: 'admin@example.com' }],
      },
      error: null,
    });
    const limit = vi.fn().mockReturnValue({ maybeSingle });
    const order = vi.fn().mockReturnValue({ limit });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });

    await expect(repositoryWith({ from }).findLatestHistory()).resolves.toMatchObject({
      users: { email: 'admin@example.com' },
    });
  });

  it('delegates rollback exclusively to the atomic replacement RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const snapshot = { hero: { title: 'Restored' } };

    await repositoryWith({ rpc }).replaceEntries(snapshot);

    expect(rpc).toHaveBeenCalledWith('replace_landing_page_config', {
      p_snapshot: snapshot,
    });
  });

  it('sanitizes RPC failures behind a repository error', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: { code: '42501', message: 'denied' } });

    await expect(repositoryWith({ rpc }).replaceEntries({})).rejects.toMatchObject({
      name: 'LandingConfigurationRepositoryError',
      operation: 'replaceEntries',
    });
  });
});
