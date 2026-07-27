import type { ScheduledPostRecord } from './scheduled-publishing-types';

export function projectCalendarEvents(posts: ScheduledPostRecord[]) {
  const groups = new Map<string, ScheduledPostRecord[]>();
  for (const post of posts) {
    const timeKey = toGmt7Hour(post.scheduled_at);
    const group = groups.get(timeKey) || [];
    group.push(post);
    groups.set(timeKey, group);
  }

  return [...groups.entries()].map(([timeKey, groupPosts]) => {
    if (groupPosts.length === 1) return projectSingle(groupPosts[0]);
    const platforms = [...new Set(groupPosts.map((post) => presentPlatform(post.platform)))];
    const hasPending = groupPosts.some((post) => post.status === 'pending');
    const allDimmed = groupPosts.every(
      (post) => post.status === 'cancelled' || post.status === 'failed'
    );
    return {
      id: `multiple-${timeKey}`,
      title: `${groupPosts.length} bài đăng`,
      start: timeKey,
      end: new Date(new Date(timeKey).getTime() + 60 * 60_000).toISOString(),
      editable: hasPending,
      startEditable: hasPending,
      durationEditable: false,
      classNames: allDimmed ? ['opacity-40'] : [],
      extendedProps: {
        platform: 'multiple',
        platforms,
        posts: groupPosts,
        isMultiple: true,
      },
    };
  });
}
function projectSingle(post: ScheduledPostRecord) {
  const title = post.captions?.articles?.title
    || post.captions?.edited_content
    || post.captions?.ai_content
    || 'Bài viết không tên';
  const editable = post.status === 'pending';
  return {
    id: post.id,
    title,
    start: post.scheduled_at,
    end: new Date(new Date(post.scheduled_at).getTime() + 30 * 60_000).toISOString(),
    editable,
    startEditable: editable,
    durationEditable: false,
    classNames: post.status === 'cancelled' || post.status === 'failed' ? ['opacity-40'] : [],
    extendedProps: {
      platform: presentPlatform(post.platform),
      status: post.status,
      captionId: post.caption_id,
      imageUrls: post.image_urls,
      post,
      isMultiple: false,
    },
  };
}

function presentPlatform(platform: string) {
  return platform === 'thread' ? 'threads' : platform;
}

function toGmt7Hour(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() + 7 * 60 * 60_000);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`
    + `T${pad(local.getUTCHours())}:00:00+07:00`;
}
