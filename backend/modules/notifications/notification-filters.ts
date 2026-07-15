import type {
  NotificationCategory,
  NotificationFilter,
} from './notification-types';

export const PROMPT_KEYWORDS = ['prompt'];
export const SCHEDULE_KEYWORDS = [
  'lịch', 'lich', 'schedule', 'scheduled', 'đăng bài',
  'lên lịch', 'dời lịch', 'hủy lịch', 'thay đổi lịch',
];

export function buildNotificationFilter(
  role: string | null,
  category: NotificationCategory
): NotificationFilter {
  const isAdmin = role === 'admin';
  if (isAdmin && category === 'bai-dang') return { kind: 'empty' };
  if (category === 'bai-dang') {
    return { kind: 'types', types: ['post_success', 'post_failed'] };
  }
  if (category === 'prompt') {
    return { kind: 'keywords', type: 'info', keywords: PROMPT_KEYWORDS };
  }
  if (category === 'lich') {
    return isAdmin
      ? { kind: 'keywords', type: 'info', keywords: SCHEDULE_KEYWORDS }
      : { kind: 'schedule', keywords: SCHEDULE_KEYWORDS };
  }
  if (category === 'he-thong') {
    return {
      kind: 'exclude-keywords',
      type: 'info',
      keywords: [...PROMPT_KEYWORDS, ...SCHEDULE_KEYWORDS],
    };
  }
  return isAdmin ? { kind: 'types', types: ['info'] } : { kind: 'all' };
}

export function buildKeywordOrFilter(keywords: string[]) {
  return keywords.flatMap((keyword) => [
    `title.ilike.%${keyword}%`,
    `message.ilike.%${keyword}%`,
  ]).join(',');
}
