import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crawlUrl, isSafeUrl } from '@/lib/crawler';
import { preprocessArticle } from '@/lib/crawler/preprocess';
import type { ListingData } from '@/lib/crawler/preprocess';
import { ProductionStyleSampleSource } from '@/backend/modules/author-profiles/style-sample-source-adapter';
import { SupabaseAuthorProfileRepository } from '@/backend/modules/author-profiles/author-profile-repository';

vi.mock('@/lib/crawler', () => ({ crawlUrl: vi.fn(), isSafeUrl: vi.fn() }));
vi.mock('@/lib/crawler/preprocess', () => ({ preprocessArticle: vi.fn() }));

describe('ProductionStyleSampleSource', () => {
  beforeEach(() => vi.clearAllMocks());

  it('forwards safety, crawl, and preprocess while preserving raw HTML', async () => {
    const raw = {
      url: 'https://example.com', title: 'Page', contentHtml: 'content',
      fullPageHtml: '<a href="/article">Article</a>', crawledAt: 'now',
    };
    const processed: ListingData = {
      type: 'LISTING', url: raw.url, extractedUrls: [], warning: 'Listing',
    };
    vi.mocked(isSafeUrl).mockResolvedValue(true);
    vi.mocked(crawlUrl).mockResolvedValue(raw);
    vi.mocked(preprocessArticle).mockReturnValue(processed);

    const source = new ProductionStyleSampleSource();
    await expect(source.isSafe(raw.url)).resolves.toBe(true);
    await expect(source.load(raw.url)).resolves.toEqual({ raw, processed });
    expect(crawlUrl).toHaveBeenCalledWith(raw.url);
    expect(preprocessArticle).toHaveBeenCalledWith(raw);
  });
});

function createSupabaseFake(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn(), eq: vi.fn(), neq: vi.fn(), order: vi.fn(), maybeSingle: vi.fn(),
    insert: vi.fn(), update: vi.fn(), delete: vi.fn(), single: vi.fn(),
  };
  Object.values(chain).forEach((method) => method.mockReturnValue(chain));
  chain.maybeSingle.mockResolvedValue(result);
  chain.single.mockResolvedValue(result);
  chain.order.mockResolvedValue(result);
  chain.eq.mockReturnValue(chain);
  const supabase = { from: vi.fn(() => chain) };
  return { supabase, chain };
}

describe('SupabaseAuthorProfileRepository', () => {
  it('lists profiles by owner in descending creation order', async () => {
    const { supabase, chain } = createSupabaseFake({ data: [{ id: 'profile-1' }], error: null });
    const repository = new SupabaseAuthorProfileRepository(supabase as never);

    await expect(repository.listByOwner('owner-1')).resolves.toEqual([{ id: 'profile-1' }]);
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'owner-1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('builds owner, ID, and conflict query shapes', async () => {
    const { supabase, chain } = createSupabaseFake({ data: { id: 'profile-1' }, error: null });
    const repository = new SupabaseAuthorProfileRepository(supabase as never);

    await repository.findById('profile-1');
    expect(chain.eq).toHaveBeenCalledWith('id', 'profile-1');

    await repository.findNameConflict('owner-1', 'Style', 'profile-1');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'owner-1');
    expect(chain.eq).toHaveBeenCalledWith('name', 'Style');
    expect(chain.neq).toHaveBeenCalledWith('id', 'profile-1');
  });

  it('forwards insert, update, and delete payloads', async () => {
    const { supabase, chain } = createSupabaseFake({ data: { id: 'profile-1' }, error: null });
    const repository = new SupabaseAuthorProfileRepository(supabase as never);

    await repository.insert({ name: 'Style' });
    expect(chain.insert).toHaveBeenCalledWith({ name: 'Style' });
    await repository.update('profile-1', { tuning_status: 'ready' });
    expect(chain.update).toHaveBeenCalledWith({ tuning_status: 'ready' });
    await repository.delete('profile-1');
    expect(chain.delete).toHaveBeenCalled();
  });

  it('wraps Supabase failures with the repository operation', async () => {
    const { supabase } = createSupabaseFake({ data: null, error: new Error('database failed') });
    const repository = new SupabaseAuthorProfileRepository(supabase as never);
    await expect(repository.findById('profile-1')).rejects.toMatchObject({
      name: 'AuthorProfileRepositoryError', operation: 'findById',
    });
  });
});
