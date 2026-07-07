import { describe, it, expect } from 'vitest';
import { validateThreadsLength } from '@/lib/validations/threads';

describe('Threads Validation - validateThreadsLength', () => {
  it('should pass for content under 500 characters', () => {
    const content = 'Chào mọi người, đây là một bài đăng Threads ngắn và thú vị. Bạn đã thử chưa?';
    const result = validateThreadsLength(content);
    expect(result.isValid).toBe(true);
    expect(result.length).toBe(content.length);
  });

  it('should fail for content over 500 characters', () => {
    const longContent = 'a'.repeat(501);
    const result = validateThreadsLength(longContent);
    expect(result.isValid).toBe(false);
    expect(result.length).toBe(501);
  });

  it('should detect question mark at the end', () => {
    const contentWithQuestion = 'Đây là nội dung thử nghiệm?';
    const result = validateThreadsLength(contentWithQuestion);
    expect(result.hasQuestion).toBe(true);
  });

  it('should detect question mark followed by spaces or emojis', () => {
    const contentWithEmojis = 'Hôm nay trời đẹp thế nhỉ? ☀️✨';
    const result = validateThreadsLength(contentWithEmojis);
    expect(result.hasQuestion).toBe(true);
  });

  it('should not detect question if there is no question mark', () => {
    const contentWithoutQuestion = 'Hôm nay trời đẹp quá đi.';
    const result = validateThreadsLength(contentWithoutQuestion);
    expect(result.hasQuestion).toBe(false);
  });
});
