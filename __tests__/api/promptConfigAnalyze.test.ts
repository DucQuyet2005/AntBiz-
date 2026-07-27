import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { PromptConfigAiError } from '@/backend/modules/prompt-configs/prompt-config-ai-errors';
import { DEFAULT_ANALYZED_PROMPT_CONFIG } from '@/backend/modules/prompt-configs/prompt-config-ai-module';
import { POST } from '@/app/api/prompt-configs/analyze/route';

const mocks = vi.hoisted(() => ({
  requireUserWithRole: vi.fn(),
  buildModule: vi.fn(),
  analyzeArticle: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({ requireUserWithRole: mocks.requireUserWithRole }));
vi.mock('@/app/api/prompt-configs/_ai-adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/api/prompt-configs/_ai-adapter')>();
  return { ...actual, buildPromptConfigAiModule: mocks.buildModule };
});

function request(body: string) {
  return new NextRequest('http://localhost/api/prompt-configs/analyze', {
    method: 'POST',
    body,
  });
}

describe('POST /api/prompt-configs/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUserWithRole.mockResolvedValue({ unauthorized: null });
    mocks.buildModule.mockReturnValue({ analyzeArticle: mocks.analyzeArticle });
  });

  it('returns the existing unauthorized response', async () => {
    mocks.requireUserWithRole.mockResolvedValue({
      unauthorized: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    expect((await POST(request('{}'))).status).toBe(401);
  });

  it('returns 500 when the Gemini key is missing', async () => {
    mocks.buildModule.mockImplementation(() => {
      throw new PromptConfigAiError('MISSING_GEMINI_KEY', 'Thiếu GEMINI_API_KEY trong .env');
    });
    const response = await POST(request('{'));
    expect(response.status).toBe(500);
  });

  it('returns fail-soft defaults for malformed JSON or invalid fields', async () => {
    const malformed = await POST(request('{'));
    const invalid = await POST(request(JSON.stringify({ title: 123, content: null })));
    await expect(malformed.json()).resolves.toEqual(DEFAULT_ANALYZED_PROMPT_CONFIG);
    await expect(invalid.json()).resolves.toEqual(DEFAULT_ANALYZED_PROMPT_CONFIG);
    expect(mocks.analyzeArticle).not.toHaveBeenCalled();
  });

  it('returns the analyzed configuration', async () => {
    mocks.analyzeArticle.mockResolvedValue({
      tone: 'Thân thiện',
      length: 'Ngắn',
      emphasis: 'Ưu đãi',
    });
    const response = await POST(request(JSON.stringify({ title: 'Title', content: 'Body' })));
    await expect(response.json()).resolves.toEqual({
      tone: 'Thân thiện',
      length: 'Ngắn',
      emphasis: 'Ưu đãi',
    });
  });
});
