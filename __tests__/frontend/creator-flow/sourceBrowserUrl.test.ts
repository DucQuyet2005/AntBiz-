import { describe, expect, it } from 'vitest';
import {
  getCreatorSourceBaseUrl,
  normalizeCreatorSourceUrl,
  validateCreatorArticleUrl,
} from '@/frontend/modules/creator-flow/source-browser-url';

describe('AI Creator source browser URL policy', () => {
  it('provides the configured source home page', () => {
    expect(getCreatorSourceBaseUrl('dantri')).toBe('https://dantri.com.vn');
  });

  it('accepts HTTPS article URLs on the selected source and its subdomains', () => {
    expect(validateCreatorArticleUrl(
      'dantri',
      'https://dantri.com.vn/cong-nghe/bai-viet-1.htm',
    )).toEqual({
      valid: true,
      url: 'https://dantri.com.vn/cong-nghe/bai-viet-1.htm',
    });
    expect(normalizeCreatorSourceUrl(
      'tuoitre',
      'https://m.tuoitre.vn/bai-viet.htm',
    )).toBe('https://m.tuoitre.vn/bai-viet.htm');
  });

  it.each([
    ['the source home page', 'https://dantri.com.vn/'],
    ['an insecure URL', 'http://dantri.com.vn/bai-viet.htm'],
    ['another source', 'https://tuoitre.vn/bai-viet.htm'],
    ['a deceptive hostname', 'https://dantri.com.vn.example.com/bai-viet.htm'],
    ['credentials in the URL', 'https://user:password@dantri.com.vn/bai-viet.htm'],
    ['malformed input', 'not-a-url'],
  ])('rejects %s', (_label, url) => {
    expect(validateCreatorArticleUrl('dantri', url).valid).toBe(false);
  });
});
