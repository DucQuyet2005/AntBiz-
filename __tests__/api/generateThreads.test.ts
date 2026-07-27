import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { CaptionGenerationEvent } from '@/backend/modules/caption-generation/caption-generation-types';
import { POST } from '@/app/api/captions/generate/route';

const mocks = vi.hoisted(() => ({
  requireUserWithRole: vi.fn(),
  generate: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({ requireUserWithRole: mocks.requireUserWithRole }));

vi.mock('@/app/api/captions/generate/_adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/api/captions/generate/_adapter')>();
  return {
    ...actual,
    buildCaptionGenerationModule: () => ({ generate: mocks.generate }),
  };
});

describe('Threads Caption Generation SSE contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUserWithRole.mockResolvedValue({
      user: { id: 'user-1' },
      supabase: {},
      unauthorized: null,
    });
  });

  it('closes after a validation error without emitting DONE', async () => {
    const events: CaptionGenerationEvent[] = [
      { type: 'text', text: 'a'.repeat(501) },
      {
        type: 'validation-error',
        error: 'Độ dài nội dung Threads (501 ký tự) vượt quá giới hạn 500 ký tự.',
        done: true,
      },
    ];
    mocks.generate.mockResolvedValue({
      events: (async function* () {
        for (const event of events) yield event;
      })(),
    });

    const response = await POST(new NextRequest('http://localhost/api/captions/generate', {
      method: 'POST',
      body: JSON.stringify({ articleId: 'article-1', platform: 'threads' }),
    }));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('vượt quá giới hạn 500 ký tự');
    expect(body).not.toContain('[DONE]');
  });
});
