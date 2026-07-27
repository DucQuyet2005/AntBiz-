import { describe, expect, it } from 'vitest';
import { projectCalendarEvents } from '@/backend/modules/scheduled-publishing/calendar-projection';
import { serializeCalendarCsv, serializeCalendarIcal } from '@/backend/modules/scheduled-publishing/calendar-export';
import type { ScheduledPostRecord } from '@/backend/modules/scheduled-publishing/scheduled-publishing-types';

describe('Scheduled Publishing calendar projections', () => {
  it('groups posts in the same GMT+7 hour', () => {
    const events = projectCalendarEvents([
      post({ id: 'a', scheduled_at: '2026-07-15T01:05:00.000Z' }),
      post({ id: 'b', platform: 'thread', scheduled_at: '2026-07-15T01:45:00.000Z' }),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: 'multiple-2026-07-15T08:00:00+07:00',
      extendedProps: { platform: 'multiple', platforms: ['facebook', 'threads'] },
    });
  });

  it('preserves CSV BOM, Vietnamese headings, and escaping', () => {
    const csv = serializeCalendarCsv([post({
      captions: { id: 'c1', platform: 'facebook', edited_content: 'A "quoted" title' },
    })]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Tiêu đề,Kênh đăng,Thời gian đăng,Trạng thái');
    expect(csv).toContain('"A ""quoted"" title"');
  });

  it('escapes iCalendar text and emits one event per post', () => {
    const ical = serializeCalendarIcal([post({
      captions: { id: 'c1', platform: 'facebook', edited_content: 'Hello, world' },
    })], new Date('2026-07-15T00:00:00.000Z'));
    expect(ical).toContain('BEGIN:VEVENT');
    expect(ical).toContain('SUMMARY:[Facebook] Hello\\, world');
    expect(ical).toContain('END:VCALENDAR');
  });
});

function post(overrides: Partial<ScheduledPostRecord> = {}): ScheduledPostRecord {
  return {
    id: 'sp1', caption_id: 'c1', created_by: 'u1', platform: 'facebook',
    status: 'pending', scheduled_at: '2026-07-15T01:05:00.000Z',
    created_at: '2026-07-15T00:00:00.000Z', image_urls: [],
    captions: { id: 'c1', platform: 'facebook', edited_content: 'Caption' },
    ...overrides,
  };
}
