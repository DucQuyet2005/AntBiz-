/**
 * Unit + Integration tests for /api/stt (Groq Whisper STT + Gemini Rewrite)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------- Mocks ----------

vi.mock('@/lib/api/auth', () => ({
  requireUserWithRole: vi.fn().mockResolvedValue({
    user: { id: 'user-001', email: 'test@antbiz.com' },
    supabase: {},
    unauthorized: null,
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ---------- Helpers ----------

function makeFormData(opts: { file?: File; bullets?: string }): FormData {
  const fd = new FormData();
  if (opts.file) fd.append('file', opts.file);
  if (opts.bullets) fd.append('bullets', opts.bullets);
  return fd;
}

function makeRequest(fd: FormData): Request {
  return new Request('http://localhost/api/stt', { method: 'POST', body: fd });
}

// ---------- Tests ----------

describe('POST /api/stt (Groq Whisper + Gemini Rewrite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.GEMINI_API_KEY = 'test-gemini-key';
  });

  it('returns 400 when neither file nor bullets are provided', async () => {
    const { POST } = await import('@/app/api/stt/route');
    const res = await POST(makeRequest(new FormData()) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/upload file/i);
  });

  it('returns 400 when file type is not audio/video (PDF)', async () => {
    const { POST } = await import('@/app/api/stt/route');
    const pdfFile = new File(['%PDF-1.4'], 'doc.pdf', { type: 'application/pdf' });
    const res = await POST(makeRequest(makeFormData({ file: pdfFile })) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Định dạng file/i);
  });

  it('returns 400 when file is too large (>25MB)', async () => {
    const { POST } = await import('@/app/api/stt/route');
    const bigFile = new File([new Uint8Array(26 * 1024 * 1024)], 'big.mp3', { type: 'audio/mpeg' });
    const res = await POST(makeRequest(makeFormData({ file: bigFile })) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/quá lớn/i);
  });

  it('returns 500 when GROQ_API_KEY is missing', async () => {
    delete process.env.GROQ_API_KEY;
    const { POST } = await import('@/app/api/stt/route');
    const res = await POST(makeRequest(makeFormData({ bullets: 'some points' })) as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/GROQ_API_KEY/i);
  });

  it('processes bullets-only (no file) → rewrite without calling Groq', async () => {
    // Only Gemini rewrite call — Groq should NOT be called
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Bài đăng hoàn chỉnh từ ý chính.' }] } }],
      }),
    });

    const { POST } = await import('@/app/api/stt/route');
    const res = await POST(makeRequest(makeFormData({ bullets: 'Hành trình khởi nghiệp 3 năm' })) as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.transcript).toBe('Hành trình khởi nghiệp 3 năm');
    expect(body.rewritten_post).toBe('Bài đăng hoàn chỉnh từ ý chính.');
    // Only 1 fetch call = Gemini rewrite; Groq was NOT called
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('googleapis.com'),
      expect.any(Object)
    );
  });

  it('returns { transcript, rewritten_post } for valid audio file via Groq', async () => {
    // Mock 1: Groq Whisper → plain text response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'Xin chào, hôm nay tôi muốn chia sẻ về hành trình của mình.',
      json: async () => ({}),
    });
    // Mock 2: Gemini rewrite → polished post
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Hook mạnh. Nội dung hay. #hashtag' }] } }],
      }),
    });

    const { POST } = await import('@/app/api/stt/route');
    const audioFile = new File([new Uint8Array(100)], 'voice.mp3', { type: 'audio/mpeg' });
    const res = await POST(makeRequest(makeFormData({ file: audioFile })) as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.transcript).toContain('Xin chào');
    expect(body.rewritten_post).toContain('Hook mạnh');
    // Exactly 2 fetch calls: Groq STT + Gemini rewrite
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'https://api.groq.com/openai/v1/audio/transcriptions',
      expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer test-groq-key' } })
    );
  });
});
