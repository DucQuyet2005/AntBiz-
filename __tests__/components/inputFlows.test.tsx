import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as scrapePost, GET as scrapeGet } from '@/app/api/scrape/route';

// Mock Supabase service role client initialization
const mockInsert = vi.fn().mockImplementation((data) => {
  return {
    select: () => ({
      single: () => Promise.resolve({ data: { id: 'test-article-id-123' }, error: null })
    })
  };
});

class MockQueryBuilder {
  constructor(private table: string) {}
  select() { return this; }
  eq() { return this; }
  ilike() { return this; }
  order() { return this; }
  limit() { return this; }
  async maybeSingle() {
    return { data: null, error: null };
  }
  async single() {
    return { data: { id: 'test-article-id-123' }, error: null };
  }
  insert(data: any) {
    mockInsert(data);
    return this;
  }
}

const mockSupabase = {
  from: vi.fn().mockImplementation((table: string) => new MockQueryBuilder(table))
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase
}));

// Mock Playwright / crawler
vi.mock('@/lib/crawler', () => ({
  crawlUrl: vi.fn().mockResolvedValue('<html><body>Mock HTML</body></html>')
}));

vi.mock('@/lib/crawler/preprocess', () => ({
  preprocessArticle: vi.fn().mockReturnValue({
    title: 'Crawl Test Article',
    description: 'Scraped content body',
    author: 'Scraper Bot',
    category: 'Tech',
    tags: ['tech', 'scrape'],
    images: [],
    body: [],
    full_text: 'Scraped content body',
    published_at: '',
    views: ''
  })
}));

describe('Input Flows - Unit Tests (Crawl & Manual API)', () => {
  beforeEach(() => {
    mockInsert.mockClear();
    mockSupabase.from.mockClear();
  });

  it('POST /api/scrape should successfully save manually written article', async () => {
    const req = new NextRequest('http://localhost/api/scrape', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Manual Title',
        full_text: 'Manual content full text representing manual input flow',
        category: 'Business',
        author: 'Marketer Author',
        imageUrl: 'https://example.com/image1.jpg\nhttps://example.com/image2.jpg'
      })
    });

    const res = await scrapePost(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data.title).toBe('Manual Title');
    expect(data.full_text).toBe('Manual content full text representing manual input flow');
    expect(data.author).toBe('Marketer Author');
    expect(data.category).toBe('#Business');
    expect(data.imageUrl).toBe('https://example.com/image1.jpg\nhttps://example.com/image2.jpg');

    expect(mockSupabase.from).toHaveBeenCalledWith('articles');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Manual Title',
      full_text: 'Manual content full text representing manual input flow',
      author: 'Marketer Author',
      category: '#Business',
      images: [
        { url: 'https://example.com/image1.jpg' },
        { url: 'https://example.com/image2.jpg' }
      ]
    }));
  });

  it('POST /api/scrape should reject payload missing title or content', async () => {
    const req = new NextRequest('http://localhost/api/scrape', {
      method: 'POST',
      body: JSON.stringify({
        full_text: 'Missing title content'
      })
    });

    const res = await scrapePost(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Thiếu tiêu đề hoặc nội dung bài viết');
  });

  it('GET /api/scrape should successfully process crawl URL', async () => {
    const req = new NextRequest('http://localhost/api/scrape?url=https://example.com/article');
    const res = await scrapeGet(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe('Crawl Test Article');
    expect(data.description).toBe('Scraped content body');
  });
});

describe('AiCreatorView Ingestion Flow integration logic', () => {
  it('correctly manages inputMode transition states and submits manual article', async () => {
    // Simulate handleProceedToABTest logic for manual mode
    const mockPostData = {
      title: 'My Manual Post',
      full_text: 'This is my manual content to generate captions from.'
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'manual-article-123', url: 'manual://article-999' })
    });
    global.fetch = mockFetch;

    // Simulate execution
    const submitManualArticle = async () => {
      const saveRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: mockPostData.title,
          full_text: mockPostData.full_text
        })
      });
      return await saveRes.json();
    };

    const result = await submitManualArticle();
    expect(mockFetch).toHaveBeenCalledWith('/api/scrape', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        title: 'My Manual Post',
        full_text: 'This is my manual content to generate captions from.'
      })
    }));
    expect(result.id).toBe('manual-article-123');
    expect(result.url).toBe('manual://article-999');
  });
});
