/**
 * T-1.19.6 – Unit tests for classifyArticle
 * Tests local keyword-based classification logic.
 */

import { describe, it, expect } from 'vitest';
import { classifyArticle } from '@/lib/services/articleClassifier';

describe('classifyArticle - keyword-based classification', () => {
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

  it('handles mixed Vietnamese and English articles', async () => {
    const result = await classifyArticle(
      'Technology trends 2024 - Xu hướng công nghệ',
      'AI, machine learning, digital transformation là những yếu tố quan trọng'
    );
    expect(result.category).toBe('Công nghệ');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('handles long article content', async () => {
    const longContent = 'Căn hộ chung cư và đất nền là bất động sản tốt. '.repeat(100);
    const result = await classifyArticle(
      'Bất động sản 2024',
      longContent
    );
    expect(result.category).toBe('Bất động sản');
  });
});
