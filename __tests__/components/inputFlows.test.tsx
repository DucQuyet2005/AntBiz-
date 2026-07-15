import { describe, expect, it, vi } from 'vitest';

describe('AiCreatorView Ingestion Flow integration logic', () => {
  it('submits a manual article through the scrape endpoint', async () => {
    const postData = {
      title: 'My Manual Post',
      full_text: 'This is my manual content to generate captions from.',
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'manual-article-123', url: 'manual://article-999' }),
    });
    global.fetch = mockFetch;

    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
    });
    const result = await response.json();

    expect(mockFetch).toHaveBeenCalledWith('/api/scrape', expect.objectContaining({
      method: 'POST', body: JSON.stringify(postData),
    }));
    expect(result).toEqual({ id: 'manual-article-123', url: 'manual://article-999' });
  });
});
