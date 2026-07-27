import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crawlUrl, isSafeUrl } from '@/lib/crawler';
import { preprocessArticle } from '@/lib/crawler/preprocess';
import { ProductionArticleSource } from '@/backend/modules/article-ingestion/article-source-adapter';
import { SupabaseArticleIngestionRepository } from '@/backend/modules/article-ingestion/article-ingestion-repository';

vi.mock('@/lib/crawler', () => ({
  crawlUrl: vi.fn(),
  isSafeUrl: vi.fn(),
}));

vi.mock('@/lib/crawler/preprocess', () => ({
  preprocessArticle: vi.fn(),
}));

describe('ProductionArticleSource', () => {
  beforeEach(() => vi.clearAllMocks());

  it('forwards URL safety checks and preprocesses crawler output', async () => {
    vi.mocked(isSafeUrl).mockResolvedValue(true);
    vi.mocked(crawlUrl).mockResolvedValue({ raw: true } as never);
    vi.mocked(preprocessArticle).mockReturnValue({
      type: 'ARTICLE',
      url: 'https://example.com/article',
      title: 'Article',
    } as never);

    const source = new ProductionArticleSource();

    await expect(source.isSafe('https://example.com/article')).resolves.toBe(true);
    await expect(source.crawl('https://example.com/article')).resolves.toMatchObject({
      type: 'ARTICLE',
      title: 'Article',
    });
    expect(isSafeUrl).toHaveBeenCalledWith('https://example.com/article');
    expect(crawlUrl).toHaveBeenCalledWith('https://example.com/article');
    expect(preprocessArticle).toHaveBeenCalledWith({ raw: true });
  });
});

function createSupabaseFake(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    ilike: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    single: vi.fn(),
  };
  Object.values(chain).forEach((method) => method.mockReturnValue(chain));
  chain.maybeSingle.mockResolvedValue(result);
  chain.single.mockResolvedValue(result);
  const supabase = { from: vi.fn(() => chain) };
  return { supabase, chain };
}

describe('SupabaseArticleIngestionRepository', () => {
  it('uses exact and prefix URL lookups', async () => {
    const { supabase, chain } = createSupabaseFake({ data: { id: 'article-1' }, error: null });
    const repository = new SupabaseArticleIngestionRepository(supabase as never);

    await expect(repository.findExact('https://example.com/a')).resolves.toEqual({ id: 'article-1' });
    expect(chain.eq).toHaveBeenCalledWith('url', 'https://example.com/a');

    await expect(repository.findPrefix('https://example.com/a')).resolves.toEqual({ id: 'article-1' });
    expect(chain.ilike).toHaveBeenCalledWith('url', 'https://example.com/a%');
    expect(chain.order).toHaveBeenCalledWith('crawled_at', { ascending: false });
  });

  it('wraps database failures with the repository operation', async () => {
    const { supabase } = createSupabaseFake({ data: null, error: new Error('database failed') });
    const repository = new SupabaseArticleIngestionRepository(supabase as never);

    await expect(repository.insert({ title: 'Article' })).rejects.toMatchObject({
      name: 'ArticleIngestionRepositoryError',
      operation: 'insert',
    });
  });

  it('forwards update and insert payloads to Supabase', async () => {
    const { supabase, chain } = createSupabaseFake({ data: { id: 'article-1' }, error: null });
    const repository = new SupabaseArticleIngestionRepository(supabase as never);

    await repository.update('article-1', { title: 'Updated' });
    expect(chain.update).toHaveBeenCalledWith({ title: 'Updated' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'article-1');

    await repository.insert({ title: 'Inserted' });
    expect(chain.insert).toHaveBeenCalledWith({ title: 'Inserted' });
  });
});
