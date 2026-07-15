import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { CaptionGenerationError } from '@/backend/modules/caption-generation/errors';
import type { CaptionGenerationEvent } from '@/backend/modules/caption-generation/caption-generation-types';
import { POST } from '@/app/api/captions/generate/route';

const mocks = vi.hoisted(() => ({
  requireUserWithRole: vi.fn(),
  generate: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({
  requireUserWithRole: mocks.requireUserWithRole,
}));

vi.mock('@/app/api/captions/generate/_adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/api/captions/generate/_adapter')>();
  return {
    ...actual,
    buildCaptionGenerationModule: () => ({ generate: mocks.generate }),
  };
});

function request(body: string) {
  return new NextRequest('http://localhost/api/captions/generate', {
    method: 'POST',
    body,
  });
}

function eventSession(events: CaptionGenerationEvent[]) {
  return {
    events: (async function* () {
      for (const event of events) yield event;
    })(),
  };
}

async function readBody(response: Response) {
  return await response.text();
}

describe('POST /api/captions/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUserWithRole.mockResolvedValue({
      user: { id: 'user-1' },
      supabase: {},
      unauthorized: null,
    });
  });

  it('returns the existing unauthorized response', async () => {
    mocks.requireUserWithRole.mockResolvedValue({
      user: null,
      supabase: {},
      unauthorized: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const response = await POST(request(JSON.stringify({ articleId: 'a1', promptId: 'p1' })));
    expect(response.status).toBe(401);
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await POST(request('{'));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'Body không phải JSON hợp lệ' });
  });

  it('returns 400 when source or content configuration is missing', async () => {
    const missingConfiguration = await POST(request(JSON.stringify({ url: 'https://example.com' })));
    const missingSource = await POST(request(JSON.stringify({ promptId: 'prompt-1' })));
    expect(missingConfiguration.status).toBe(400);
    expect(missingSource.status).toBe(400);
  });

  it('maps typed preparation errors to JSON', async () => {
    mocks.generate.mockRejectedValue(
      new CaptionGenerationError('PROMPT_NOT_FOUND', 404, 'Không tìm thấy prompt')
    );
    const response = await POST(request(JSON.stringify({ articleId: 'a1', promptId: 'missing' })));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Không tìm thấy prompt' });
  });

  it('passes the authenticated actor and validated defaults to the module', async () => {
    mocks.generate.mockResolvedValue(eventSession([
      {
        type: 'completed',
        done: true,
        captionId: '',
        articleId: 'a1',
        variantGroupId: null,
      },
    ]));
    await readBody(await POST(request(JSON.stringify({ articleId: 'a1', promptId: 'p1' }))));
    expect(mocks.generate).toHaveBeenCalledWith(
      { id: 'user-1' },
      expect.objectContaining({ articleId: 'a1', promptId: 'p1', variantIndex: 0 })
    );
  });

  it('encodes text, completion metadata, and DONE as SSE', async () => {
    mocks.generate.mockResolvedValue(eventSession([
      { type: 'text', text: 'Hello' },
      {
        type: 'completed',
        done: true,
        captionId: 'caption-1',
        articleId: 'article-1',
        variantGroupId: 'group-1',
      },
    ]));
    const response = await POST(request(JSON.stringify({ articleId: 'a1', promptId: 'p1' })));
    const body = await readBody(response);

    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(body).toBe(
      'data: {"text":"Hello"}\n\n' +
      'data: {"done":true,"captionId":"caption-1","articleId":"article-1","variantGroupId":"group-1"}\n\n' +
      'data: [DONE]\n\n'
    );
  });

  it('maps unexpected preparation failures to 500', async () => {
    mocks.generate.mockRejectedValue(new Error('Unexpected failure'));
    const response = await POST(request(JSON.stringify({ articleId: 'a1', promptId: 'p1' })));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Unexpected failure' });
  });
});
