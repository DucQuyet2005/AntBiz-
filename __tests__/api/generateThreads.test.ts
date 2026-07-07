import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as generateCaption } from '@/app/api/captions/generate/route';

let currentRole = 'marketer_full';
let mockArticlesDb: any[] = [];
let mockPromptsDb: any[] = [];
let mockCaptionsDb: any[] = [];

// Mock query builder for Supabase
class MockQueryBuilder {
  constructor(private table: string) {}
  select() { return this; }
  eq() { return this; }
  maybeSingle() {
    if (this.table === 'users') {
      return Promise.resolve({ data: { role: currentRole }, error: null });
    }
    if (this.table === 'articles') {
      return Promise.resolve({ data: mockArticlesDb[0] || null, error: null });
    }
    if (this.table === 'prompts') {
      return Promise.resolve({ data: mockPromptsDb[0] || null, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  }
  single() {
    if (this.table === 'users') {
      return Promise.resolve({ data: { role: currentRole }, error: null });
    }
    return Promise.resolve({ data: mockArticlesDb[0] || null, error: null });
  }
  insert(data: any) {
    if (this.table === 'captions') {
      mockCaptionsDb = [{ id: 'c1', ...data }];
    }
    return this;
  }
  then(onfulfilled: any) {
    return Promise.resolve({ data: mockCaptionsDb, error: null }).then(onfulfilled);
  }
}

const mockGetUser = vi.fn();
const mockSupabaseClient = {
  auth: { getUser: mockGetUser },
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

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Threads Integration - Generate API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentRole = 'marketer_full';
    mockArticlesDb = [{ id: 'a1', title: 'Test Threads Article', description: 'Brief description.' }];
    mockPromptsDb = [];
    mockCaptionsDb = [];
    process.env.GEMINI_API_KEY = 'mock-key';
    process.env.GEMINI_MODEL = 'gemini-2.5-flash';
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  });

  it('should generate Threads caption and save as thread platform in database', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            '[\n  {\n    "candidates": [\n      {\n        "content": {\n          "parts": [\n            {\n              "text": "Chào các bạn trẻ, hôm nay có gì vui không?"\n            }\n          ]\n        }\n      }\n    ]\n  }\n]'
          )
        );
        controller.close();
      },
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: mockStream,
    });

    const req = new NextRequest('http://localhost/api/captions/generate', {
      method: 'POST',
      body: JSON.stringify({
        articleId: 'a1',
        platform: 'threads',
      }),
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

    expect(result).toContain('Chào các bạn trẻ, hôm nay có gì vui không?');
    expect(mockCaptionsDb.length).toBe(1);
    expect(mockCaptionsDb[0].platform).toBe('thread');
    expect(mockCaptionsDb[0].status).toBe('draft');
  });

  it('should return error if generated Threads content exceeds 500 characters', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            JSON.stringify([
              {
                candidates: [
                  {
                    content: {
                      parts: [
                        {
                          text: 'a'.repeat(550),
                        },
                      ],
                    },
                  },
                ],
              },
            ])
          )
        );
        controller.close();
      },
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: mockStream,
    });

    const req = new NextRequest('http://localhost/api/captions/generate', {
      method: 'POST',
      body: JSON.stringify({
        articleId: 'a1',
        platform: 'threads',
      }),
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

    expect(result).toContain('vượt quá giới hạn 500 ký tự');
  });
});
