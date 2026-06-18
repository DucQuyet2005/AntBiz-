/**
 * T-1.19.6 – Unit tests for classifyArticle
 * Tests: AI path, keyword fallback, confidence clamping, unknown category fallback.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock fetch ───────────────────────────────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// We import after setting up global fetch mock
let classifyArticle: (title: string, content: string) => Promise<{ category: string; confidence: number }>;

beforeEach(async () => {
  vi.resetModules();
  mockFetch.mockReset();
  // Set env var for AI path tests
  process.env.GEMINI_API_KEY = 'test-key';
  const mod = await import('@/lib/services/articleClassifier');
  classifyArticle = mod.classifyArticle;
});

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
});

// ── 1. Keyword fallback (no API key) ────────────────────────────────────────
describe('classifyArticle – keyword fallback (no API key)', () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it('classifies real estate articles correctly', async () => {
    const result = await classifyArticle(
      '10 năm mua vàng và hành trình thoát cảnh ở trọ',
      'Mua nhà, căn hộ, đất nền là ước mơ của nhiều người'
    );
    expect(result.category).toBe('Bất động sản');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('classifies finance articles correctly', async () => {
    const result = await classifyArticle(
      'Chiến lược tiết kiệm tài chính hiệu quả',
      'Đầu tư vào quỹ mở, ngân hàng lãi suất cao nhất 2024'
    );
    expect(result.category).toBe('Tài chính');
  });

  it('returns default category with low confidence for unrecognized content', async () => {
    const result = await classifyArticle('', '');
    expect(result.category).toBeTruthy();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

// ── 2. AI path (with API key) ────────────────────────────────────────────────
describe('classifyArticle – AI path (GEMINI_API_KEY set)', () => {
  it('parses valid Gemini response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '{"category":"Đầu tư","confidence":0.92}' }],
            },
          },
        ],
      }),
    });

    const result = await classifyArticle(
      'Cổ phiếu tăng mạnh trong tuần qua',
      'Thị trường chứng khoán Việt Nam ghi nhận kỷ lục mới'
    );
    expect(result.category).toBe('Đầu tư');
    expect(result.confidence).toBeCloseTo(0.92);
  });

  it('falls back to keyword when Gemini returns invalid category', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '{"category":"InvalidCategory","confidence":0.8}' }],
            },
          },
        ],
      }),
    });

    const result = await classifyArticle(
      'Mua nhà chung cư giá rẻ',
      'Căn hộ 2 phòng ngủ đất nền vùng ven'
    );
    // Invalid category → falls back to keyword result
    expect(result.category).toBeTruthy();
    expect(['Bất động sản', 'Tổ ấm 4.0', 'Cuộc sống']).toContain(result.category);
  });

  it('falls back to keyword when Gemini API fails (non-ok response)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    const result = await classifyArticle(
      'Sức khỏe tâm thần tuổi trẻ',
      'Dinh dưỡng và thể thao giúp cải thiện sức khoẻ'
    );
    expect(result.category).toBeTruthy(); // fallback succeeds
  });

  it('clamps confidence to [0, 1]', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '{"category":"Công nghệ","confidence":1.5}' }],
            },
          },
        ],
      }),
    });

    const result = await classifyArticle('AI và tương lai', 'Trí tuệ nhân tạo thay đổi mọi thứ');
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
