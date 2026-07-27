import type { ScheduledPostRecord } from './scheduled-publishing-types';

const platformLabels: Record<string, string> = {
  facebook: 'Facebook', instagram: 'Instagram', thread: 'Threads', threads: 'Threads',
};
const statusLabels: Record<string, string> = {
  pending: 'Chờ đăng', posted: 'Đã đăng', failed: 'Lỗi', cancelled: 'Đã hủy',
};

export function serializeCalendarCsv(posts: ScheduledPostRecord[]) {
  const uniquePlatforms = [...new Set(posts.map((post) => post.platform.toLowerCase()))];
  let title = 'LỊCH ĐĂNG BÀI';
  if (uniquePlatforms.length === 1) {
    title += ` ${platformLabels[uniquePlatforms[0]]?.toUpperCase() || uniquePlatforms[0].toUpperCase()}`;
  } else if (uniquePlatforms.length > 1) {
    title = 'LỊCH ĐĂNG BÀI ĐA NỀN TẢNG';
  }
  const rows = [
    `"${title}",,,`,
    'Tiêu đề,Kênh đăng,Thời gian đăng,Trạng thái',
  ];
  for (const post of posts) {
    const values = [
      titleFor(post),
      platformLabels[post.platform.toLowerCase()] || post.platform,
      `\u200b${formatGmt7(post.scheduled_at)}`,
      statusLabels[post.status.toLowerCase()] || post.status,
    ];
    rows.push(values.map(escapeCsv).join(','));
  }
  return '\ufeff' + rows.join('\r\n');
}
export function serializeCalendarIcal(posts: ScheduledPostRecord[], now = new Date()) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AntBiz//Editorial Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  const icalStatuses: Record<string, string> = {
    pending: 'Chờ đăng (Scheduled)', posted: 'Đã đăng (Posted)',
    failed: 'Lỗi (Failed)', cancelled: 'Đã hủy (Cancelled)',
  };
  for (const post of posts) {
    const platform = platformLabels[post.platform.toLowerCase()] || post.platform;
    const status = icalStatuses[post.status.toLowerCase()] || post.status;
    const preview = post.captions?.edited_content || post.captions?.ai_content || '';
    const truncated = preview.length > 150 ? `${preview.slice(0, 150)}...` : preview;
    const description = `Kênh đăng: ${platform}\nTrạng thái: ${status}`
      + `\nThời gian: ${formatGmt7(post.scheduled_at)} (GMT+7)\n\n---\nNội dung:\n${truncated}`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${post.id}@antbiz.com`,
      `DTSTAMP:${toIcalDate(post.created_at || now.toISOString())}`,
      `DTSTART:${toIcalDate(post.scheduled_at)}`,
      `DTEND:${toIcalDate(new Date(new Date(post.scheduled_at).getTime() + 10 * 60_000).toISOString())}`,
      `SUMMARY:${escapeIcal(`[${platform}] ${titleFor(post)}`)}`,
      `DESCRIPTION:${escapeIcal(description)}`,
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function titleFor(post: ScheduledPostRecord) {
  return post.captions?.articles?.title
    || post.captions?.edited_content
    || post.captions?.ai_content
    || 'AntBiz Campaign';
}

function formatGmt7(value: string) {
  const local = new Date(new Date(value).getTime() + 7 * 60 * 60_000);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())} `
    + `${pad(local.getUTCDate())}/${pad(local.getUTCMonth() + 1)}/${local.getUTCFullYear()}`;
}

function toIcalDate(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`
    + `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function escapeCsv(value: string) {
  return `"${String(value || '').replace(/"/g, '""')}"`;
}

function escapeIcal(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
