import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseCaptionManagementRepository } from '@/backend/modules/caption-management/caption-management-repository';

describe('SupabaseCaptionManagementRepository', () => {
  it('applies list filters, newest-first ordering, exact count, and range', async () => {
    const builder = {
      select: vi.fn(), eq: vi.fn(), or: vi.fn(), order: vi.fn(), range: vi.fn(),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.or.mockReturnValue(builder);
    builder.order.mockReturnValue(builder);
    builder.range.mockResolvedValue({ data: [], count: 12, error: null });
    const client = { from: vi.fn(() => builder) } as unknown as SupabaseClient;
    const repository = new SupabaseCaptionManagementRepository(client);

    await expect(repository.listCaptions({
      platform: 'thread', search: 'sale', from: 10, to: 19,
    })).resolves.toEqual({ data: [], count: 12 });
    expect(client.from).toHaveBeenCalledWith('captions');
    expect(builder.select).toHaveBeenCalledWith(expect.any(String), { count: 'exact' });
    expect(builder.eq).toHaveBeenCalledWith('platform', 'thread');
    expect(builder.or).toHaveBeenCalledWith(expect.stringContaining('sale'));
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder.range).toHaveBeenCalledWith(10, 19);
  });

  it('links only unbound versions for the matching article and platform', async () => {
    const builder = {
      update: vi.fn(), eq: vi.fn(), is: vi.fn(),
    };
    builder.update.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.is.mockResolvedValue({ error: null });
    const client = { from: vi.fn(() => builder) } as unknown as SupabaseClient;
    const repository = new SupabaseCaptionManagementRepository(client);

    await repository.linkDraftVersions('article-1', 'instagram', 'caption-1');
    expect(client.from).toHaveBeenCalledWith('caption_versions');
    expect(builder.update).toHaveBeenCalledWith({ caption_id: 'caption-1' });
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'article_id', 'article-1');
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'platform', 'instagram');
    expect(builder.is).toHaveBeenCalledWith('caption_id', null);
  });
});
