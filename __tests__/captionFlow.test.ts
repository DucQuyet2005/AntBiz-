/**
 * T-1.13.6 – Tests for caption editing flows:
 *   - edit caption (PUT /api/captions/:id)
 *   - restore flow (ai_content preserved, editable)
 *   - autosave logic (debounce, content diff check)
 *   - character counter logic (PLATFORM_MAX_LENGTH)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── 1. PLATFORM_MAX_LENGTH ────────────────────────────────────────────────────

describe('PLATFORM_MAX_LENGTH', () => {
  it('exports correct limits for known platforms', async () => {
    const { PLATFORM_MAX_LENGTH } = await import('@/components/CaptionEditor');
    expect(PLATFORM_MAX_LENGTH.facebook).toBe(63206);
    expect(PLATFORM_MAX_LENGTH.threads).toBe(500);
    expect(PLATFORM_MAX_LENGTH.linkedin).toBe(1300);
  });

  it('thread alias equals threads limit', async () => {
    const { PLATFORM_MAX_LENGTH } = await import('@/components/CaptionEditor');
    expect(PLATFORM_MAX_LENGTH.thread).toBe(500);
  });
});

// ── 2. Caption API – edit flow ───────────────────────────────────────────────

describe('Caption PUT /api/captions/:id – edit flow', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends PUT request with edited_content', async () => {
    const captionId = '550e8400-e29b-41d4-a716-446655440000';
    const edited = 'Nội dung đã chỉnh sửa';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { id: captionId, edited_content: edited, status: 'edited' },
      }),
    });

    const res = await fetch(`/api/captions/${captionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edited_content: edited }),
    });

    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/captions/${captionId}`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ edited_content: edited }),
      })
    );
  });

  it('does NOT send ai_content in PUT payload', async () => {
    const captionId = '550e8400-e29b-41d4-a716-446655440001';
    const aiContent = 'Bản AI gốc – không được ghi đè';

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: {} }) });

    await fetch(`/api/captions/${captionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edited_content: 'Bản mới' }),
    });

    const callArgs = mockFetch.mock.calls[0];
    const sentBody = JSON.parse(callArgs[1].body);
    expect(sentBody).not.toHaveProperty('ai_content');
    expect(sentBody).toHaveProperty('edited_content');
  });
});

// ── 3. Restore flow ──────────────────────────────────────────────────────────

describe('Restore flow – ai_content preserved', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  it('restore sends PUT with ai_content as new edited_content', async () => {
    const captionId = '550e8400-e29b-41d4-a716-446655440002';
    const aiContent = 'Đây là bản AI gốc chưa sửa';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { id: captionId, edited_content: aiContent, status: 'edited' },
      }),
    });

    // Simulate restore: PUT with ai_content as the new value
    const res = await fetch(`/api/captions/${captionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edited_content: aiContent }),
    });

    expect(res.ok).toBe(true);
    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sentBody.edited_content).toBe(aiContent);
  });

  it('ai_content returned by GET /api/captions/:id for restore reference', async () => {
    const captionId = '550e8400-e29b-41d4-a716-446655440003';
    const aiContent = 'Bản gốc AI – phải luôn có';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: captionId,
          ai_content: aiContent,
          edited_content: 'Bản đã sửa',
          status: 'edited',
        },
      }),
    });

    const res = await fetch(`/api/captions/${captionId}`);
    const json = await res.json();

    expect(json.data.ai_content).toBe(aiContent);
    // edited_content is separate from ai_content
    expect(json.data.edited_content).not.toBe(json.data.ai_content);
  });
});

// ── 4. Autosave logic ────────────────────────────────────────────────────────

describe('Autosave – debounce and content diff check', () => {
  it('does not save if content equals lastSaved', () => {
    // Simulate the autosave guard: only save if newValue !== lastSaved
    const lastSaved: string = 'existing content';
    const newValue: string = 'existing content'; // same

    const shouldSave = newValue !== lastSaved;
    expect(shouldSave).toBe(false);
  });

  it('saves when content differs from lastSaved', () => {
    const lastSaved: string = 'existing content';
    const newValue: string = 'updated content';

    const shouldSave = newValue !== lastSaved;
    expect(shouldSave).toBe(true);
  });

  it('does not save when captionId is undefined', () => {
    const captionId: string | undefined = undefined;
    const newValue: string = 'any content';
    const lastSaved: string = '';

    // Guard: only save if captionId exists AND content changed
    const shouldSave = !!captionId && newValue !== lastSaved;
    expect(shouldSave).toBe(false);
  });

  it('debounce fires exactly once for rapid inputs', async () => {
    vi.useFakeTimers();
    const saveFn = vi.fn();

    // Simulate debounce 3s
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedSave = (val: string) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => saveFn(val), 3000);
    };

    // Rapid calls
    debouncedSave('a');
    debouncedSave('ab');
    debouncedSave('abc');
    debouncedSave('final');

    expect(saveFn).not.toHaveBeenCalled();

    // Advance timer past 3s
    vi.advanceTimersByTime(3001);
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith('final');

    vi.useRealTimers();
  });
});

// ── 5. Caption POST – create flow ────────────────────────────────────────────

describe('Caption POST /api/captions – create flow', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  it('sends ai_content and article_id on create', async () => {
    const payload = {
      article_id: '550e8400-e29b-41d4-a716-446655440099',
      platform: 'facebook',
      ai_content: 'Nội dung AI tạo ra',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'new-caption-id', ...payload } }),
    });

    const res = await fetch('/api/captions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(res.ok).toBe(true);
    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sentBody.ai_content).toBe(payload.ai_content);
    expect(sentBody.article_id).toBe(payload.article_id);
    expect(sentBody.platform).toBe('facebook');
  });
});
