import { describe, expect, it, vi } from 'vitest';
import { GeminiCaptionAdapter } from '@/backend/modules/caption-generation/gemini-caption-adapter';

vi.mock('@/lib/services/geminiRotationManager', () => ({
  executeWithRotation: async (
    _input: unknown,
    operation: (key: string, model: string) => Promise<Response>
  ) => operation('test-key', 'gemini-test'),
}));

function geminiResponse(text: string) {
  return new Response(JSON.stringify([
    { candidates: [{ content: { parts: [{ text }] } }] },
  ]), { status: 200 });
}

async function collect(fragments: AsyncIterable<string>) {
  const result: string[] = [];
  for await (const fragment of fragments) result.push(fragment);
  return result;
}

describe('GeminiCaptionAdapter', () => {
  it('sends the prompt and parses text fragments from the Gemini response', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(geminiResponse('Hello\nworld'));
    const adapter = new GeminiCaptionAdapter(fetchImplementation);

    const fragments = await adapter.start({
      title: 'Title',
      content: 'Body',
      prompt: 'Write a caption',
      temperature: 0.7,
    });

    await expect(collect(fragments)).resolves.toEqual(['Hello\nworld']);
    const request = fetchImplementation.mock.calls[0]?.[1] as RequestInit;
    expect(String(request.body)).toContain('Write a caption');
    expect(String(request.body)).toContain('"temperature":0.7');
  });

  it('retries a 429 response with exponential-delay input', async () => {
    const fetchImplementation = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(geminiResponse('Recovered'));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const adapter = new GeminiCaptionAdapter(fetchImplementation, sleep);

    const fragments = await adapter.start({
      title: 'Title',
      content: 'Body',
      prompt: 'Prompt',
      temperature: 1,
    });

    await expect(collect(fragments)).resolves.toEqual(['Recovered']);
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1000);
  });
});
