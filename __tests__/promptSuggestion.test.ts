/**
 * T-1.19.6 – Unit tests for suggestPrompts + fallback logic
 * Tests: relevance scoring, tag matching, fallback to usage_count.
 */

import { describe, it, expect, vi } from 'vitest';
import { computeRelevanceScore, suggestPrompts } from '@/lib/services/promptSuggestion';
import type { Prompt } from '@/lib/types/prompt';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePrompt(overrides: Partial<Prompt & { usage_count?: number }> = {}): Prompt & { usage_count?: number } {
  return {
    id: 'prompt-' + Math.random().toString(36).slice(2),
    created_by: 'user-1',
    cloned_from: null,
    name: 'Test Prompt',
    platform: 'facebook',
    content: 'Test content',
    tags: [],
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    usage_count: 0,
    ...overrides,
  };
}

// ── 1. computeRelevanceScore ─────────────────────────────────────────────────

describe('computeRelevanceScore', () => {
  it('returns 0 when no category keywords provided', () => {
    const p = makePrompt({ tags: ['nhà', 'đất'] });
    expect(computeRelevanceScore(p, [], 10)).toBe(0);
  });

  it('returns 0 when no tags match', () => {
    const p = makePrompt({ tags: ['tech', 'ai'] });
    const score = computeRelevanceScore(p, ['nhà', 'đất', 'căn hộ'], 10);
    expect(score).toBe(0);
  });

  it('scores higher when more tags match', () => {
    const pFull = makePrompt({ tags: ['nhà', 'đất', 'căn hộ'] });
    const pPartial = makePrompt({ tags: ['nhà'] });
    const keywords = ['nhà', 'đất', 'căn hộ'];
    const maxUsage = 10;

    const scoreFull = computeRelevanceScore(pFull, keywords, maxUsage);
    const scorePartial = computeRelevanceScore(pPartial, keywords, maxUsage);
    expect(scoreFull).toBeGreaterThan(scorePartial);
  });

  it('includes usage_count in score calculation', () => {
    const pHighUsage = makePrompt({ tags: ['nhà'], usage_count: 100 });
    const pLowUsage = makePrompt({ tags: ['nhà'], usage_count: 0 });
    const keywords = ['nhà'];
    const maxUsage = 100;

    const scoreHigh = computeRelevanceScore(pHighUsage, keywords, maxUsage);
    const scoreLow = computeRelevanceScore(pLowUsage, keywords, maxUsage);
    expect(scoreHigh).toBeGreaterThan(scoreLow);
  });

  it('score is always between 0 and 1', () => {
    const p = makePrompt({ tags: ['nhà', 'đất', 'căn hộ', 'mua nhà', 'đầu tư', 'real estate'], usage_count: 1000 });
    const keywords = ['nhà', 'đất', 'căn hộ', 'mua nhà', 'đầu tư', 'real estate'];
    const score = computeRelevanceScore(p, keywords, 1000);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// ── 2. suggestPrompts ────────────────────────────────────────────────────────

describe('suggestPrompts – matched results', () => {
  it('returns relevant prompts ranked by score', async () => {
    const highRelevance = makePrompt({ tags: ['nhà', 'căn hộ', 'mua nhà'], usage_count: 5 });
    const lowRelevance = makePrompt({ tags: ['tech', 'ai'], usage_count: 100 });
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: [highRelevance, lowRelevance], error: null }),
        }),
      }),
    } as any;

    const result = await suggestPrompts(mockSupabase, { category: 'Bất động sản', confidence: 0.9 }, 3);
    expect(result.isFallback).toBe(false);
    expect(result.suggestions.length).toBeGreaterThan(0);
    // Highest relevance prompt should be first
    expect(result.suggestions[0].prompt.id).toBe(highRelevance.id);
  });

  it('respects the limit parameter', async () => {
    const prompts = Array.from({ length: 10 }, (_, i) =>
      makePrompt({ tags: ['nhà'], name: `Prompt ${i}` })
    );
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: prompts, error: null }),
        }),
      }),
    } as any;

    const result = await suggestPrompts(mockSupabase, { category: 'Bất động sản', confidence: 0.8 }, 3);
    expect(result.suggestions.length).toBeLessThanOrEqual(3);
  });
});

// ── 3. Fallback logic ────────────────────────────────────────────────────────

describe('suggestPrompts – fallback strategy', () => {
  it('falls back to top usage_count when no tags match category', async () => {
    const noMatch1 = makePrompt({ tags: ['tech'], usage_count: 50 });
    const noMatch2 = makePrompt({ tags: ['travel'], usage_count: 200 });
    const noMatch3 = makePrompt({ tags: ['food'], usage_count: 10 });

    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: [noMatch1, noMatch2, noMatch3], error: null }),
        }),
      }),
    } as any;

    const result = await suggestPrompts(mockSupabase, { category: 'Bất động sản', confidence: 0.9 }, 3);
    expect(result.isFallback).toBe(true);
    // Fallback should be sorted by usage_count DESC
    if (result.suggestions.length >= 2) {
      expect(result.suggestions[0].prompt.usage_count ?? 0)
        .toBeGreaterThanOrEqual(result.suggestions[1].prompt.usage_count ?? 0);
    }
  });

  it('returns empty suggestions when DB query fails', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: null, error: new Error('DB error') }),
        }),
      }),
    } as any;

    const result = await suggestPrompts(mockSupabase, { category: 'Bất động sản', confidence: 0.9 });
    expect(result.isFallback).toBe(true);
    expect(result.suggestions).toHaveLength(0);
  });

  it('returns isFallback=false when there are matching prompts', async () => {
    const matched = makePrompt({ tags: ['nhà', 'đất'], usage_count: 5 });
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: [matched], error: null }),
        }),
      }),
    } as any;

    const result = await suggestPrompts(mockSupabase, { category: 'Bất động sản', confidence: 0.8 });
    expect(result.isFallback).toBe(false);
  });
});
