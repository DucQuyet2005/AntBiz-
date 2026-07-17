import { describe, expect, it, vi } from 'vitest';
import { BrowserCreatorFlowClient } from '@/frontend/modules/creator-flow/creator-flow-client';

describe('BrowserCreatorFlowClient', () => {
  it('normalizes real linked accounts without assuming every platform is connected', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [
      { platform: 'facebook', account_name: 'Page' },
      { platform: 'thread', account_name: 'Threads profile' },
    ] }), { status: 200 }));
    const client = new BrowserCreatorFlowClient(request);

    await expect(client.listConnectedPlatforms()).resolves.toEqual([
      expect.objectContaining({ id: 'facebook', connected: true }),
      expect.objectContaining({ id: 'threads', connected: true }),
      expect.objectContaining({ id: 'instagram', connected: false }),
    ]);
  });

  it('persists manual content and returns the real article identifier', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'article-1', title: 'Title', full_text: 'Body', description: 'Summary',
      url: 'manual://article-1', tags: 'manual',
    }), { status: 200 }));
    const client = new BrowserCreatorFlowClient(request);

    await expect(client.createManualArticle('Title', 'Body')).resolves.toMatchObject({
      articleId: 'article-1', context: { title: 'Title', content: 'Body' },
    });
    expect(request).toHaveBeenCalledWith('/api/scrape', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ title: 'Title', full_text: 'Body' }),
    }));
  });

  it('rejects listing pages before entering the creation flow', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      type: 'LISTING',
      title: 'Danh sách bài viết',
      full_text: 'Nội dung trang danh sách',
    }), { status: 200 }));

    await expect(
      new BrowserCreatorFlowClient(request).ingestUrl('https://dantri.com.vn/xa-hoi/'),
    ).rejects.toThrow('Trang đã chọn là trang danh sách');
  });

  it('surfaces safe backend errors when crawling an article fails', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'Không thể truy cập bài viết này',
    }), { status: 422 }));

    await expect(
      new BrowserCreatorFlowClient(request).ingestUrl('https://dantri.com.vn/bai-viet.htm'),
    ).rejects.toThrow('Không thể truy cập bài viết này');
  });

  it('uploads audio to speech processing and prefers corrected text', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      transcript: 'Raw transcript',
      rewritten_post: 'Corrected transcript',
      generated_title: 'Generated title',
    }), { status: 200 }));
    const file = new File(['audio'], 'interview.mp3', { type: 'audio/mpeg' });

    await expect(new BrowserCreatorFlowClient(request).processSpeech(file)).resolves.toEqual({
      text: 'Corrected transcript',
      title: 'Generated title',
    });
    const [url, init] = request.mock.calls[0];
    expect(url).toBe('/api/stt');
    expect(init).toMatchObject({ method: 'POST' });
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('file')).toBe(file);
  });

  it('falls back to the raw transcript when speech correction is empty', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      transcript: 'Raw transcript', rewritten_post: '   ',
    }), { status: 200 }));
    const file = new File(['audio'], 'interview.wav', { type: 'audio/wav' });

    await expect(new BrowserCreatorFlowClient(request).processSpeech(file)).resolves.toEqual({
      text: 'Raw transcript',
    });
  });

  it('uploads documents to the parsing endpoint', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      text: 'Extracted document',
    }), { status: 200 }));
    const file = new File(['document'], 'report.pdf', { type: 'application/pdf' });

    await expect(new BrowserCreatorFlowClient(request).parseDocument(file)).resolves.toEqual({
      text: 'Extracted document',
    });
    expect(request).toHaveBeenCalledWith('/api/parse-doc', expect.objectContaining({
      method: 'POST', body: expect.any(FormData),
    }));
  });

  it('surfaces safe backend errors for source processing', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'Chưa thể xử lý tệp âm thanh lúc này',
    }), { status: 500 }));
    const file = new File(['audio'], 'interview.mp3', { type: 'audio/mpeg' });

    await expect(new BrowserCreatorFlowClient(request).processSpeech(file)).rejects.toThrow(
      'Chưa thể xử lý tệp âm thanh lúc này'
    );
  });
});
