import { describe, expect, it } from 'vitest';
import { ArticleIngestionModule } from '@/backend/modules/article-ingestion/article-ingestion-module';
import type {
  ArticleIngestionRepository,
  ArticleRecord,
  ArticleSource,
  ArticleSourceResult,
} from '@/backend/modules/article-ingestion/article-ingestion-types';

class FakeSource implements ArticleSource {
  safe = true;
  result: ArticleSourceResult = {
    type: 'ARTICLE', url: 'https://example.com/article', title: 'Title',
    description: 'Description', category: 'Tech', author: 'Author',
    images: [{ url: 'one.jpg' }, { url: 'two.jpg' }], tags: ['tech', 'news'],
    body: [], full_text: 'Full text', published_at: 'today', views: '10',
  };
  error: unknown = null;
  async isSafe() { return this.safe; }
  async crawl() { if (this.error) throw this.error; return this.result; }
}

class FakeRepository implements ArticleIngestionRepository {
  exact: ArticleRecord | null = null;
  prefix: ArticleRecord | null = null;
  inserted: Record<string, unknown> | null = null;
  updated: Record<string, unknown> | null = null;
  lookupError: unknown = null;
  writeError: unknown = null;
  async findExact() { if (this.lookupError) throw this.lookupError; return this.exact; }
  async findPrefix() { return this.prefix; }
  async update(id: string, input: Record<string, unknown>) {
    if (this.writeError) throw this.writeError;
    this.updated = { id, ...input }; return { id };
  }
  async insert(input: Record<string, unknown>) {
    if (this.writeError) throw this.writeError;
    this.inserted = input; return { id: 'article-1' };
  }
}

function setup() {
  const source = new FakeSource();
  const repository = new FakeRepository();
  return { source, repository, ingestion: new ArticleIngestionModule(source, repository) };
}

describe('ArticleIngestionModule', () => {
  it('rejects invalid and unsafe URLs', async () => {
    const { source, ingestion } = setup();
    await expect(ingestion.ingestUrl('invalid')).rejects.toMatchObject({ code: 'INVALID_URL', status: 400 });
    source.safe = false;
    await expect(ingestion.ingestUrl('https://localhost.test')).rejects.toMatchObject({ code: 'UNSAFE_URL', status: 400 });
  });

  it('maps URL-safety and crawler failures to controlled source errors', async () => {
    const safety = setup();
    safety.source.isSafe = async () => { throw new Error('safety failed'); };
    await expect(safety.ingestion.ingestUrl('https://example.com/article'))
      .rejects.toMatchObject({ code: 'SOURCE_FAILED', status: 500 });

    const crawler = setup();
    crawler.source.error = new Error('crawl failed');
    await expect(crawler.ingestion.ingestUrl('https://example.com/article'))
      .rejects.toMatchObject({ code: 'SOURCE_FAILED', clientMessage: 'crawl failed' });
  });

  it('returns LISTING data without persistence', async () => {
    const { source, repository, ingestion } = setup();
    source.result = {
      type: 'LISTING', url: 'https://example.com', extractedUrls: ['a'], warning: 'listing',
    };
    await expect(ingestion.ingestUrl('https://example.com')).resolves.toEqual({
      type: 'LISTING', url: 'https://example.com', extractedUrls: ['a'], warning: 'listing',
    });
    expect(repository.inserted).toBeNull();
  });

  it('normalizes and inserts a new crawled article', async () => {
    const { repository, ingestion } = setup();
    const result = await ingestion.ingestUrl('https://example.com/article');
    expect(repository.inserted).toMatchObject({ category: '#Tech', full_text: 'Full text' });
    expect(result).toMatchObject({
      id: 'article-1', category: '#Tech', imageUrl: 'one.jpg\ntwo.jpg', tags: 'tech, news',
    });
  });

  it('uses exact then prefix matching and updates existing records', async () => {
    const { repository, ingestion } = setup();
    repository.prefix = { id: 'prefix-1' };
    await ingestion.ingestUrl('https://example.com/article');
    expect(repository.updated).toMatchObject({ id: 'prefix-1', title: 'Title' });
  });

  it('returns crawled content when lookup or write persistence fails', async () => {
    const lookup = setup();
    lookup.repository.lookupError = new Error('lookup failed');
    lookup.repository.writeError = new Error('write failed');
    await expect(lookup.ingestion.ingestUrl('https://example.com/article'))
      .resolves.toMatchObject({ id: '', title: 'Title' });

    const update = setup();
    update.repository.exact = { id: 'existing-1' };
    update.repository.writeError = new Error('update failed');
    await expect(update.ingestion.ingestUrl('https://example.com/article'))
      .resolves.toMatchObject({ id: 'existing-1', title: 'Title' });
  });

  it('applies manual defaults, truncation, and image parsing', async () => {
    const { repository, ingestion } = setup();
    const fullText = 'a'.repeat(210);
    const result = await ingestion.createManual({
      title: 'Manual', full_text: fullText, imageUrl: ' one.jpg \n\ntwo.jpg',
    });
    expect(repository.inserted).toMatchObject({
      author: 'AntBiz User', category: '#Manual', tags: ['manual'],
      images: [{ url: 'one.jpg' }, { url: 'two.jpg' }],
      description: `${'a'.repeat(197)}...`,
    });
    expect(result).toMatchObject({ id: 'article-1', tags: 'manual' });
  });

  it('treats manual persistence failure as fatal', async () => {
    const { repository, ingestion } = setup();
    repository.writeError = new Error('insert failed');
    await expect(ingestion.createManual({ title: 'Manual', full_text: 'Body' }))
      .rejects.toMatchObject({ code: 'MANUAL_PERSISTENCE_FAILED', status: 500 });
  });
});
