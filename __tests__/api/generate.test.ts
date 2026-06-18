import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as generateCaption } from '@/app/api/captions/generate/route';

let currentRole = 'marketer_full';
let mockError = false;
let mockInsertError = false;
let mockArticleFetchError = false;  // scoped: only fails articles.maybeSingle()
let mockArticlesDb: any[] = [];
let mockPromptsDb: any[] = [];
let mockCaptionsDb: any[] = [];

// Mock query builder for Supabase
class MockQueryBuilder {
  constructor(private table: string) {}

  select(columns?: string, options?: any) {
    return this;
  }

  eq(column: string, value: any) {
    return this;
  }

  maybeSingle() {
    let result: any = { data: null, error: null };
    if (mockError) {
      return Promise.resolve({ data: null, error: new Error('Database error') });
    }
    if (this.table === 'users') {
      return Promise.resolve({ data: { role: currentRole }, error: null });
    }
    if (this.table === 'articles') {
      if (mockArticleFetchError) {
        return Promise.resolve({ data: null, error: new Error('Không thể tải bài viết từ database') });
      }
      result = { data: mockArticlesDb[0] || null, error: null };
    } else if (this.table === 'prompts') {
      result = { data: mockPromptsDb[0] || null, error: null };
    }
    return Promise.resolve(result);
  }

  single() {
    let result: any = { data: null, error: null };
    if (mockError) {
      return Promise.resolve({ data: null, error: new Error('Database error') });
    }
    if (this.table === 'users') {
      return Promise.resolve({ data: { role: currentRole }, error: null });
    }
    if (this.table === 'articles') {
      result = { data: mockArticlesDb[0] || null, error: null };
    }
    return Promise.resolve(result);
  }

  insert(data: any) {
    if (this.table === 'articles') {
      mockArticlesDb = [{ id: 'a1', ...data }];
    } else if (this.table === 'captions') {
      mockCaptionsDb = [{ id: 'c1', ...data }];
    }
    return this;
  }

  then(onfulfilled: any) {
    let result: any = { data: null, error: null };
    if (mockError) {
      result = { data: null, error: new Error('Database error') };
    } else if (mockInsertError && this.table === 'captions') {
      result = { data: null, error: new Error('Database Insert error') };
    } else if (this.table === 'users') {
      result = { data: { role: currentRole }, error: null };
    } else if (this.table === 'articles') {
      result = { data: mockArticlesDb, error: null };
    } else if (this.table === 'captions') {
      result = { data: mockCaptionsDb, error: null };
    }
    return Promise.resolve(result).then(onfulfilled);
  }
}

const mockGetUser = vi.fn();
const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: (table: string) => new MockQueryBuilder(table),
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => mockSupabaseClient,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseClient,
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [],
    setAll: () => {},
  }),
}));

// Mock the TypeScript crawler modules instead of child_process / fs
const mockCrawlUrl = vi.fn();
const mockPreprocessArticle = vi.fn();

vi.mock('@/lib/crawler', () => ({
  crawlUrl: (...args: any[]) => mockCrawlUrl(...args),
}));

vi.mock('@/lib/crawler/preprocess', () => ({
  preprocessArticle: (...args: any[]) => mockPreprocessArticle(...args),
}));

// Mock global fetch (for Gemini API)
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Captions Generate API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentRole = 'marketer_full';
    mockError = false;
    mockInsertError = false;
    mockArticleFetchError = false;
    mockArticlesDb = [];
    mockPromptsDb = [];
    mockCaptionsDb = [];
    process.env.GEMINI_API_KEY = 'mock-key';

    // Default crawler mock: returns structured article data
    const defaultArticleData = {
      url: 'https://test.com',
      title: 'Mock Title',
      category: 'Tech',
      description: 'Mock Desc',
      author: 'Mock Author',
      published_at: '2026-06-17',
      views: '100',
      images: [],
      body: [],
      full_text: 'Mock body content',
      tags: ['tech'],
    };
    mockCrawlUrl.mockResolvedValue({ url: 'https://test.com', title: 'Mock Title', contentHtml: '', fullPageHtml: '', crawledAt: '' });
    mockPreprocessArticle.mockReturnValue(defaultArticleData);
  });

  it('returns 401 if not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') });
    const req = new NextRequest('http://localhost/api/captions/generate', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://test.com', promptId: 'p1' }),
    });
    const res = await generateCaption(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 if promptId is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const req = new NextRequest('http://localhost/api/captions/generate', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://test.com' }),
    });
    const res = await generateCaption(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Thiếu promptId');
  });

  it('returns 400 if both url and articleId are missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const req = new NextRequest('http://localhost/api/captions/generate', {
      method: 'POST',
      body: JSON.stringify({ promptId: 'p1' }),
    });
    const res = await generateCaption(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Thiếu url hoặc articleId');
  });

  it('returns 400 if invalid url is provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const req = new NextRequest('http://localhost/api/captions/generate', {
      method: 'POST',
      body: JSON.stringify({ url: 'not-a-valid-url', promptId: 'p1' }),
    });
    const res = await generateCaption(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('URL không hợp lệ');
  });

  it('returns 404 if prompt not found in database', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockPromptsDb = []; // empty prompts
    mockArticlesDb = [{ id: 'a1', title: 'Existing' }];

    const req = new NextRequest('http://localhost/api/captions/generate', {
      method: 'POST',
      body: JSON.stringify({ articleId: 'a1', promptId: 'p1' }),
    });
    const res = await generateCaption(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain('Không tìm thấy prompt');
  });

  it('returns 500 if GEMINI_API_KEY is not defined', async () => {
    delete process.env.GEMINI_API_KEY;
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockPromptsDb = [{ id: 'p1', name: 'Mock Prompt', content: 'Write caption' }];
    mockArticlesDb = [{ id: 'a1', title: 'Existing' }];

    const req = new NextRequest('http://localhost/api/captions/generate', {
      method: 'POST',
      body: JSON.stringify({ articleId: 'a1', promptId: 'p1' }),
    });
    const res = await generateCaption(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Chưa cấu hình API key');
  });

  it('returns 500 if crawler fails to fetch the page', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockPromptsDb = [{ id: 'p1', name: 'Mock Prompt', content: 'Write caption', platform: 'facebook' }];

    // Make crawlUrl throw — simulates network / Playwright error
    mockCrawlUrl.mockRejectedValue(new Error('Playwright launch failed'));

    const req = new NextRequest('http://localhost/api/captions/generate', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://test.com/fail', promptId: 'p1' }),
    });
    const res = await generateCaption(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Không thể cào và tiền xử lý');
  });

  it('returns 500 if preprocessArticle throws during content parsing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockPromptsDb = [{ id: 'p1', name: 'Mock Prompt', content: 'Write caption', platform: 'facebook' }];

    // crawlUrl succeeds but preprocessArticle throws
    mockCrawlUrl.mockResolvedValue({ url: 'https://test.com/noparse', contentHtml: '', fullPageHtml: '', title: '', crawledAt: '' });
    mockPreprocessArticle.mockImplementation(() => { throw new Error('Parse error'); });

    const req = new NextRequest('http://localhost/api/captions/generate', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://test.com/noparse', promptId: 'p1' }),
    });
    const res = await generateCaption(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Không thể cào và tiền xử lý');
  });

  it('successfully triggers crawler and returns a stream on successful generation', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockPromptsDb = [{ id: 'p1', name: 'Mock Prompt', content: 'Write caption', platform: 'facebook' }];
    
    // Mock fetch for Gemini API stream response
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('[\n  {\n    "candidates": [\n      {\n        "content": {\n          "parts": [\n            {\n              "text": "Hello Facebook Caption!"\n            }\n          ]\n        }\n      }\n    ]\n  }\n]'));
        controller.close();
      }
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: mockStream,
    });

    const req = new NextRequest('http://localhost/api/captions/generate', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://test.com/new-article', promptId: 'p1' }),
    });
    
    const res = await generateCaption(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let result = '';
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value);
    }

    expect(result).toContain('Hello Facebook Caption!');
    expect(result).toContain('[DONE]');
  });

  it('successfully handles pre-existing articles by ID and handles rate limit retries', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockPromptsDb = [{ id: 'p1', name: 'Mock Prompt', content: 'Write caption', platform: 'facebook' }];
    mockArticlesDb = [{ id: 'a1', title: 'Pre-existing Article', full_text: 'Article body text' }];

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('[\n  {\n    "candidates": [\n      {\n        "content": {\n          "parts": [\n            {\n              "text": "Caption for existing article"\n            }\n          ]\n        }\n      }\n    ]\n  }\n]'));
        controller.close();
      }
    });

    // First fetch mock fails with 429, second succeeds
    mockFetch
      .mockResolvedValueOnce({
        status: 429,
        ok: false,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockStream,
      });

    const req = new NextRequest('http://localhost/api/captions/generate', {
      method: 'POST',
      body: JSON.stringify({ articleId: 'a1', promptId: 'p1' }),
    });

    const res = await generateCaption(req);
    expect(res.status).toBe(200);
    
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let result = '';
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value);
    }

    expect(result).toContain('Caption for existing article');
  });

  it('logs error when saving generated caption to database fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockPromptsDb = [{ id: 'p1', name: 'Mock Prompt', content: 'Write caption', platform: 'facebook' }];
    mockArticlesDb = [{ id: 'a1', title: 'Existing' }];
    mockInsertError = true; // DB insert will fail

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('[\n  {\n    "candidates": [\n      {\n        "content": {\n          "parts": [\n            {\n              "text": "Caption with DB error"\n            }\n          ]\n        }\n      }\n    ]\n  }\n]'));
        controller.close();
      }
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: mockStream,
    });

    const req = new NextRequest('http://localhost/api/captions/generate', {
      method: 'POST',
      body: JSON.stringify({ articleId: 'a1', promptId: 'p1' }),
    });

    const res = await generateCaption(req);
    expect(res.status).toBe(200);

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    while (reader) {
      const { done } = await reader.read();
      if (done) break;
    }
  });

  it('returns 500 when unexpected global error occurs', async () => {
    mockGetUser.mockRejectedValue(new Error('Unexpected global system crash'));

    const req = new NextRequest('http://localhost/api/captions/generate', {
      method: 'POST',
      body: JSON.stringify({ articleId: 'a1', promptId: 'p1' }),
    });

    const res = await generateCaption(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Unexpected global system crash');
  });

  it('saves generated caption with status=draft to the captions table (T-1.12.6)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockPromptsDb = [{ id: 'p1', name: 'Caption Prompt', content: 'Write me a caption', platform: 'facebook' }];
    mockArticlesDb = [{ id: 'a1', title: 'Draft Test Article', full_text: 'Full article text' }];

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            '[\n  {\n    "candidates": [\n      {\n        "content": {\n          "parts": [\n            {\n              "text": "Draft caption content"\n            }\n          ]\n        }\n      }\n    ]\n  }\n]'
          )
        );
        controller.close();
      }
    });

    mockFetch.mockResolvedValue({ ok: true, status: 200, body: mockStream });

    const req = new NextRequest('http://localhost/api/captions/generate', {
      method: 'POST',
      body: JSON.stringify({ articleId: 'a1', promptId: 'p1' }),
    });

    const res = await generateCaption(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');

    // Drain the stream
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let output = '';
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      output += decoder.decode(value);
    }

    // Verify caption text was streamed
    expect(output).toContain('Draft caption content');
    expect(output).toContain('[DONE]');

    // Verify DB was written with status='draft'
    expect(mockCaptionsDb.length).toBeGreaterThan(0);
    expect(mockCaptionsDb[0].status).toBe('draft');
    expect(mockCaptionsDb[0].article_id).toBe('a1');
    expect(mockCaptionsDb[0].prompt_id).toBe('p1');
    expect(mockCaptionsDb[0].created_by).toBe('u1');
    expect(mockCaptionsDb[0].platform).toBe('facebook');
    expect(typeof mockCaptionsDb[0].ai_content).toBe('string');
    expect(mockCaptionsDb[0].ai_content.length).toBeGreaterThan(0);
  });

  it('returns 500 when fetching article by articleId hits a database error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    // Use scoped flag so auth (users table) still passes, only articles query fails
    mockArticleFetchError = true;

    const req = new NextRequest('http://localhost/api/captions/generate', {
      method: 'POST',
      body: JSON.stringify({ articleId: 'a1', promptId: 'p1' }),
    });

    const res = await generateCaption(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Không thể tải bài viết');
  });
});

