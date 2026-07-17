import { describe, expect, it, vi } from 'vitest';
import { BrowserQuickPublishingClient } from '@/frontend/modules/quick-publishing';

function sseResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  }), { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

describe('BrowserQuickPublishingClient', () => {
  it('does not bind the client instance as the fetch receiver', async () => {
    const request = function (this: unknown) {
      if (this instanceof BrowserQuickPublishingClient) {
        throw new TypeError('Illegal invocation');
      }
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }));
    } as typeof fetch;

    const client = new BrowserQuickPublishingClient(request);

    await expect(client.listPresets('facebook')).resolves.toEqual([]);
  });

  it('preserves generation JSON and parses SSE split across chunks', async () => {
    const request = vi.fn().mockResolvedValue(sseResponse([
      'data: {"text":"Hel',
      'lo"}\n\ndata: {"done":true,"captionId":"caption-1","articleId":"article-1"}\n\n',
      'data: [DONE]\n\n',
    ]));
    const client = new BrowserQuickPublishingClient(request);
    const command = {
      articleId: 'article-1', customPrompt: 'Prompt', platform: 'facebook' as const,
      variantGroupId: 'group-1', variantIndex: 0, stylePresetId: 'none', presetMode: 'none' as const,
    };
    const events = [];
    for await (const event of client.generate(command)) events.push(event);

    expect(request).toHaveBeenCalledWith('/api/captions/generate', expect.objectContaining({
      method: 'POST', body: JSON.stringify(command),
    }));
    expect(events).toEqual([
      { type: 'text', text: 'Hello' },
      { type: 'completed', captionId: 'caption-1', articleId: 'article-1' },
    ]);
  });

  it('never exposes raw error bodies in typed failures', async () => {
    const request = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'raw provider response with secret' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    ));
    const client = new BrowserQuickPublishingClient(request);
    const consume = async () => {
      for await (const event of client.generate({
        articleId: 'article-1', customPrompt: 'Prompt', platform: 'facebook',
        variantGroupId: 'group-1', variantIndex: 0, stylePresetId: 'none', presetMode: 'none',
      })) { void event; }
    };

    await expect(consume()).rejects.toMatchObject({ code: 'GENERATION_FAILED', context: { status: 500 } });
    await expect(consume()).rejects.not.toThrow('raw provider response with secret');
  });

  it('calls persisted edit, regeneration, publish-now, and schedule contracts', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'caption-1', status: 'draft' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: {
        caption: { id: 'caption-1', edited_content: 'New content', status: 'edited' },
        mode: 'partial', generatedText: 'New', replacementRange: { start: 0, end: 3 },
      } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: {} }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: {} }), { status: 201 }));
    const client = new BrowserQuickPublishingClient(request);

    await client.updateCaption('caption-1', { edited_content: 'Edited', status: 'draft' });
    await expect(client.regenerateCaption('caption-1', {
      mode: 'partial', selectionStart: 0, selectionEnd: 3, selectedText: 'Old',
      instruction: 'Rewrite', presetMode: 'none',
    })).resolves.toMatchObject({ content: 'New content', mode: 'partial' });
    await client.publishNow({ captionId: 'caption-1', imageUrls: [] });
    await client.schedule({ captionId: 'caption-1', scheduledAt: '2026-07-18T09:00:00Z', imageUrls: [] });

    expect(request).toHaveBeenNthCalledWith(2, '/api/captions/caption-1/regenerate', expect.objectContaining({ method: 'POST' }));
    expect(request).toHaveBeenNthCalledWith(3, '/api/scheduled-posts/publish-now', expect.objectContaining({ method: 'POST' }));
    expect(request).toHaveBeenNthCalledWith(4, '/api/scheduled-posts', expect.objectContaining({ method: 'POST' }));
  });
});
