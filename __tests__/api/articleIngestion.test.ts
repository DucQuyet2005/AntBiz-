import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { ArticleIngestionError } from '@/backend/modules/article-ingestion/errors';
import { GET, POST } from '@/app/api/scrape/route';

const mocks = vi.hoisted(() => ({
  requireUserWithRole: vi.fn(), buildModule: vi.fn(),
  ingestUrl: vi.fn(), createManual: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({ requireUserWithRole: mocks.requireUserWithRole }));
vi.mock('@/app/api/scrape/_adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/api/scrape/_adapter')>();
  return { ...actual, buildArticleIngestionModule: mocks.buildModule };
});

describe('/api/scrape contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUserWithRole.mockResolvedValue({ unauthorized: null });
    mocks.buildModule.mockReturnValue({ ingestUrl: mocks.ingestUrl, createManual: mocks.createManual });
  });

  it('requires authentication for GET and POST', async () => {
    mocks.requireUserWithRole.mockResolvedValue({
      unauthorized: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    expect((await GET(new NextRequest('http://localhost/api/scrape?url=https://example.com'))).status).toBe(401);
    expect((await POST(new NextRequest('http://localhost/api/scrape', {
      method: 'POST', body: JSON.stringify({ title: 'T', full_text: 'B' }),
    }))).status).toBe(401);
  });

  it('returns 400 for missing URL', async () => {
    expect((await GET(new NextRequest('http://localhost/api/scrape'))).status).toBe(400);
  });

  it('returns ARTICLE and LISTING results unchanged', async () => {
    mocks.ingestUrl.mockResolvedValueOnce({ id: 'article-1', title: 'Article' });
    const article = await GET(new NextRequest('http://localhost/api/scrape?url=https://example.com/a'));
    await expect(article.json()).resolves.toEqual({ id: 'article-1', title: 'Article' });
    mocks.ingestUrl.mockResolvedValueOnce({ type: 'LISTING', extractedUrls: ['a'] });
    const listing = await GET(new NextRequest('http://localhost/api/scrape?url=https://example.com'));
    await expect(listing.json()).resolves.toEqual({ type: 'LISTING', extractedUrls: ['a'] });
  });

  it('maps typed URL errors', async () => {
    mocks.ingestUrl.mockRejectedValue(
      new ArticleIngestionError('UNSAFE_URL', 400, 'Địa chỉ URL không được phép truy cập')
    );
    expect((await GET(new NextRequest('http://localhost/api/scrape?url=https://localhost'))).status).toBe(400);
  });

  it('returns 400 for malformed or invalid manual bodies', async () => {
    const malformed = await POST(new NextRequest('http://localhost/api/scrape', { method: 'POST', body: '{' }));
    const invalid = await POST(new NextRequest('http://localhost/api/scrape', {
      method: 'POST', body: JSON.stringify({ full_text: 'Missing title' }),
    }));
    expect(malformed.status).toBe(400);
    expect(invalid.status).toBe(400);
  });

  it('creates a manual article through the module', async () => {
    mocks.createManual.mockResolvedValue({ id: 'manual-1', title: 'Manual' });
    const response = await POST(new NextRequest('http://localhost/api/scrape', {
      method: 'POST', body: JSON.stringify({ title: 'Manual', full_text: 'Body' }),
    }));
    await expect(response.json()).resolves.toEqual({ id: 'manual-1', title: 'Manual' });
    expect(mocks.createManual).toHaveBeenCalledWith({ title: 'Manual', full_text: 'Body' });
  });
});
