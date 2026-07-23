import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/scheduled-posts/ical/route';

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
  }),
}));

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({}),
}));

vi.mock('@/app/api/scheduled-posts/_adapter', () => ({
  buildScheduledPublishingModule: vi.fn().mockReturnValue({
    calendarIcal: vi.fn().mockResolvedValue(
      'BEGIN:VCALENDAR\nVERSION:2.0\nSUMMARY:AntBiz Test\nEND:VCALENDAR'
    ),
  }),
  scheduledPublishingErrorResponse: vi.fn(),
}));

describe('GET /api/scheduled-posts/ical', () => {
  it('returns 200 with text/calendar Content-Type and iCal body', async () => {
    const req = new NextRequest('http://localhost:3000/api/scheduled-posts/ical');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/calendar');
    const text = await res.text();
    expect(text).toContain('BEGIN:VCALENDAR');
    expect(text).toContain('AntBiz Test');
  });
});
