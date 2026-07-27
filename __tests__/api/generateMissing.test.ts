import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/generate-missing/route';

// Mock dependencies
vi.mock('@/lib/api/auth', () => ({
  requireUserWithRole: vi.fn().mockResolvedValue({ unauthorized: null }),
}));

let mockResponseText = JSON.stringify({
  title: 'AI Generated Title',
  full_text: 'AI Generated Detailed Content',
  category: 'Công nghệ',
  tags: 'tag1, tag2'
});

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: () => Promise.resolve({
            response: {
              text: () => mockResponseText,
            },
          }),
        };
      }
    },
  };
});

describe('POST /api/generate-missing endpoint', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'mock-key';
  });

  it('returns 400 when both title and full_text are empty', async () => {
    const req = new NextRequest('http://localhost/api/generate-missing', {
      method: 'POST',
      body: JSON.stringify({
        title: '',
        full_text: '',
        category: '',
        tags: ''
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Vui lòng cung cấp ít nhất');
  });

  it('returns 200 and fills missing fields when valid inputs are given', async () => {
    mockResponseText = JSON.stringify({
      title: 'AI Generated Title from Body',
      full_text: 'Existing detailed body content',
      category: 'Kinh doanh',
      tags: 'business, consulting'
    });

    const req = new NextRequest('http://localhost/api/generate-missing', {
      method: 'POST',
      body: JSON.stringify({
        title: '',
        full_text: 'Existing detailed body content',
        category: '',
        tags: ''
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.title).toBe('AI Generated Title from Body');
    expect(json.data.category).toBe('Kinh doanh');
  });
});
