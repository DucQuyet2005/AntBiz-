import { describe, expect, it } from 'vitest';
import {
  PROMPT_KEYWORDS,
  SCHEDULE_KEYWORDS,
  buildNotificationFilter,
} from '@/backend/modules/notifications/notification-filters';

describe('Notification filters', () => {
  it('restricts the admin all-inbox projection to info', () => {
    expect(buildNotificationFilter('admin', 'all')).toEqual({
      kind: 'types', types: ['info'],
    });
  });

  it('returns empty for the admin post category', () => {
    expect(buildNotificationFilter('admin', 'bai-dang')).toEqual({ kind: 'empty' });
  });

  it('selects post result types for marketers', () => {
    expect(buildNotificationFilter('marketer_full', 'bai-dang')).toEqual({
      kind: 'types', types: ['post_success', 'post_failed'],
    });
  });

  it('builds prompt and schedule keyword plans', () => {
    expect(buildNotificationFilter('marketer_content', 'prompt')).toEqual({
      kind: 'keywords', type: 'info', keywords: PROMPT_KEYWORDS,
    });
    expect(buildNotificationFilter('marketer_content', 'lich')).toEqual({
      kind: 'schedule', keywords: SCHEDULE_KEYWORDS,
    });
    expect(buildNotificationFilter('admin', 'lich')).toEqual({
      kind: 'keywords', type: 'info', keywords: SCHEDULE_KEYWORDS,
    });
  });

  it('excludes prompt and schedule terms from system notifications', () => {
    expect(buildNotificationFilter('marketer_content', 'he-thong')).toEqual({
      kind: 'exclude-keywords', type: 'info',
      keywords: [...PROMPT_KEYWORDS, ...SCHEDULE_KEYWORDS],
    });
  });
});
