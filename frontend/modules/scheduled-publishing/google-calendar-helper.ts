/**
 * Utility function to build Google Calendar Quick Add URL.
 * Standard format required by Google Calendar:
 * https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=YYYYMMDDTHHmmssZ/YYYYMMDDTHHmmssZ&details=...&location=...
 */

export interface GoogleCalendarEventOptions {
  title: string;
  scheduledAt: string; // ISO string e.g. "2026-07-22T09:00:00.000Z"
  durationMinutes?: number;
  details?: string;
  postId?: string;
  platform?: string;
  baseUrl?: string;
}

/**
 * Formats a Date object to Google Calendar UTC ISO string: YYYYMMDDTHHmmssZ
 */
export function formatGoogleCalendarUtcDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Resolves site base URL dynamically supporting custom domains (e.g. app.example.com)
 */
export function resolveSiteBaseUrl(explicitBaseUrl?: string): string {
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');
  }
  return 'http://localhost:3000';
}

/**
 * Builds Google Calendar quick add link
 */
export function buildGoogleCalendarUrl(options: GoogleCalendarEventOptions): string {
  const startDate = new Date(options.scheduledAt);
  // Default duration 30 mins if not specified
  const duration = options.durationMinutes && options.durationMinutes > 0 ? options.durationMinutes : 30;
  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

  const startUtc = formatGoogleCalendarUtcDate(startDate);
  const endUtc = formatGoogleCalendarUtcDate(endDate);
  const datesParam = `${startUtc}/${endUtc}`;

  const origin = resolveSiteBaseUrl(options.baseUrl);
  const postUrl = options.postId ? `${origin}/calendar?postId=${encodeURIComponent(options.postId)}` : origin;

  const platformPrefix = options.platform ? `[${options.platform.toUpperCase()}] ` : '';
  const eventTitle = `${platformPrefix}${options.title || 'Lịch đăng bài AntBiz'}`;

  const detailsText = options.details
    ? `${options.details}\n\n🔗 Quản lý bài đăng trên AntBiz: ${postUrl}`
    : `🔗 Quản lý bài đăng trên AntBiz: ${postUrl}`;

  const searchParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventTitle,
    dates: datesParam,
    details: detailsText,
    location: postUrl,
  });

  return `https://calendar.google.com/calendar/render?${searchParams.toString()}`;
}
