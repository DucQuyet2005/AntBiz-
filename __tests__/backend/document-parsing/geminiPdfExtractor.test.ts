import { describe, expect, it, vi } from 'vitest';
import {
  buildGeminiModelFallback,
  GeminiPdfExtractor,
} from '@/backend/modules/document-parsing';

function successfulResponse(text = '  Extracted PDF  ') {
  return new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text }] } }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('GeminiPdfExtractor', () => {
  it('sends the expected inline PDF request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(successfulResponse());
    const extractor = new GeminiPdfExtractor(fetchMock, () => 'api-key', () => 'custom-model');
    const bytes = new Uint8Array([1, 2, 3]);

    await expect(extractor.extract(bytes)).resolves.toBe('  Extracted PDF  ');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain('/custom-model:generateContent?key=api-key');
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(request.body as string);
    expect(request).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(body.contents[0].parts[0].inlineData).toEqual({
      mimeType: 'application/pdf',
      data: Buffer.from(bytes).toString('base64'),
    });
    expect(body.contents[0].parts[1].text).toContain('KHÔNG tóm tắt');
    expect(body.generationConfig).toEqual({ temperature: 0.1 });
  });

  it('tries the next model after a quota failure', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('quota exceeded with private detail', { status: 429 }))
      .mockResolvedValueOnce(successfulResponse('Fallback text'));
    const extractor = new GeminiPdfExtractor(fetchMock, () => 'api-key', () => 'primary-model');

    await expect(extractor.extract(new Uint8Array([1]))).resolves.toBe('Fallback text');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('/primary-model:generateContent');
    expect(fetchMock.mock.calls[1][0]).toContain('/gemini-3.5-flash:generateContent');
  });

  it('stops immediately after a non-retryable failure and hides the provider body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('secret provider response', { status: 401 })
    );
    const extractor = new GeminiPdfExtractor(fetchMock, () => 'api-key', () => 'primary-model');

    try {
      await extractor.extract(new Uint8Array([1]));
      throw new Error('Expected extraction to fail');
    } catch (error) {
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(error).toMatchObject({
        code: 'PARSING_FAILED',
        status: 500,
        context: { extractor: 'pdf', model: 'primary-model', providerStatus: 401 },
      });
      expect(JSON.stringify(error)).not.toContain('secret provider response');
      expect(JSON.stringify(error)).not.toContain('api-key');
    }
  });

  it('checks Gemini configuration only when PDF extraction is invoked', async () => {
    const fetchMock = vi.fn();
    const extractor = new GeminiPdfExtractor(fetchMock, () => undefined);

    await expect(extractor.extract(new Uint8Array([1]))).rejects.toMatchObject({
      code: 'PARSING_NOT_CONFIGURED',
      status: 500,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('deduplicates the configured model and fallbacks', () => {
    expect(buildGeminiModelFallback('gemini-3.5-flash')).toEqual([
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash-lite',
    ]);
  });
});
