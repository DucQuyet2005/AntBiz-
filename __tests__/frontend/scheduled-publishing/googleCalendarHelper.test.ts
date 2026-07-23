import { describe, expect, it } from 'vitest';
import {
  buildGoogleCalendarUrl,
  formatGoogleCalendarUtcDate,
  resolveSiteBaseUrl,
} from '@/frontend/modules/scheduled-publishing/google-calendar-helper';

describe('google-calendar-helper', () => {
  it('formats UTC date correctly to YYYYMMDDTHHmmssZ', () => {
    const d = new Date('2026-07-22T09:30:00.000Z');
    expect(formatGoogleCalendarUtcDate(d)).toBe('20260722T093000Z');
  });

  it('resolves site base URL with fallback and dynamic origin', () => {
    expect(resolveSiteBaseUrl('https://app.example.com')).toBe('https://app.example.com');
  });

  it('builds valid Google Calendar URL with TEMPLATE action and formatted dates', () => {
    const urlString = buildGoogleCalendarUrl({
      title: 'Thử nghiệm bài viết',
      scheduledAt: '2026-07-22T10:00:00.000Z',
      durationMinutes: 30,
      details: 'Nội dung caption bài viết',
      postId: 'post-123',
      platform: 'facebook',
      baseUrl: 'https://app.example.com',
    });

    const parsed = new URL(urlString);
    expect(parsed.origin).toBe('https://calendar.google.com');
    expect(parsed.pathname).toBe('/calendar/render');
    expect(parsed.searchParams.get('action')).toBe('TEMPLATE');
    expect(parsed.searchParams.get('text')).toBe('[FACEBOOK] Thử nghiệm bài viết');
    expect(parsed.searchParams.get('dates')).toBe('20260722T100000Z/20260722T103000Z');
    expect(parsed.searchParams.get('location')).toBe('https://app.example.com/calendar?postId=post-123');
    expect(parsed.searchParams.get('details')).toContain('https://app.example.com/calendar?postId=post-123');
  });
});
