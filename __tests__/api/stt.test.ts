import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  process: vi.fn(),
  requireUserWithRole: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({
  requireUserWithRole: mocks.requireUserWithRole,
}));

vi.mock('@/backend/modules/speech-processing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/backend/modules/speech-processing')>();
  return {
    ...actual,
    createSpeechProcessingModule: () => ({ process: mocks.process }),
  };
});

function requestWithFormData(values: { file?: File; bullets?: string }) {
  const body = new FormData();
  if (values.file) body.append('file', values.file);
  if (values.bullets !== undefined) body.append('bullets', values.bullets);
  return new Request('http://localhost/api/stt', { method: 'POST', body });
}

describe('POST /api/stt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUserWithRole.mockResolvedValue({
      user: { id: 'user-001' },
      supabase: {},
      unauthorized: null,
    });
    mocks.process.mockResolvedValue({
      transcript: 'Raw',
      rewrittenPost: 'Corrected',
      metadata: { title: 'Title', category: 'Category', tags: '#one' },
    });
  });

  it('returns the authorization response before parsing the body', async () => {
    const unauthorized = new Response('Unauthorized', { status: 401 });
    mocks.requireUserWithRole.mockResolvedValue({ unauthorized });
    const { POST } = await import('@/app/api/stt/route');

    await expect(POST(new Request('http://localhost/api/stt', { method: 'POST' }) as never))
      .resolves.toBe(unauthorized);
    expect(mocks.process).not.toHaveBeenCalled();
  });

  it('maps multipart fields and preserves the response contract', async () => {
    const file = new File(['audio'], 'voice.mp3', { type: 'audio/mpeg' });
    const { POST } = await import('@/app/api/stt/route');
    const response = await POST(requestWithFormData({ file, bullets: 'Notes' }) as never);

    expect(response.status).toBe(200);
    expect(mocks.process).toHaveBeenCalledWith({
      file: expect.objectContaining({ name: 'voice.mp3', type: 'audio/mpeg' }),
      bullets: 'Notes',
    });
    await expect(response.json()).resolves.toEqual({
      transcript: 'Raw',
      rewritten_post: 'Corrected',
      generated_title: 'Title',
      generated_category: 'Category',
      generated_tags: '#one',
    });
  });

  it('returns 400 for malformed multipart data', async () => {
    const request = new Request('http://localhost/api/stt', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
      body: 'invalid',
    });
    const { POST } = await import('@/app/api/stt/route');
    const response = await POST(request as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Request phải là multipart/form-data',
    });
  });

  it('maps typed module errors without leaking their cause', async () => {
    const { SpeechProcessingError } = await import('@/backend/modules/speech-processing');
    mocks.process.mockRejectedValue(new SpeechProcessingError(
      'TRANSCRIPTION_FAILED',
      500,
      'Không thể xử lý tệp âm thanh lúc này',
      { cause: new Error('secret provider body') }
    ));
    const { POST } = await import('@/app/api/stt/route');
    const response = await POST(requestWithFormData({ bullets: 'Notes' }) as never);

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).toBe(
      JSON.stringify({ error: 'Không thể xử lý tệp âm thanh lúc này' })
    );
  });

  it('returns a generic message for unexpected errors', async () => {
    mocks.process.mockRejectedValue(new Error('secret unexpected error'));
    const { POST } = await import('@/app/api/stt/route');
    const response = await POST(requestWithFormData({ bullets: 'Notes' }) as never);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Lỗi hệ thống khi xử lý giọng nói' });
  });
});
