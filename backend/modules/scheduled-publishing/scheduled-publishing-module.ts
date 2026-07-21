import { projectCalendarEvents } from './calendar-projection';
import { serializeCalendarCsv, serializeCalendarIcal } from './calendar-export';
import { ScheduledPublishingError } from './errors';
import {
  normalizePlatform,
  parseBulkRescheduleInput,
  parsePublishNowInput,
  parseRescheduleInput,
  parseScheduleInput,
  requireFutureIso,
} from './scheduled-publishing-schemas';
import type {
  BulkRescheduleInput,
  RescheduleInput,
  ScheduleInput,
  PublishNowInput,
} from './scheduled-publishing-schemas';
import type {
  CalendarFilters,
  PublicationNotifier,
  PublicationResult,
  ScheduledPostRecord,
  ScheduledPublishingActor,
  ScheduledPublishingRepository,
  SocialPublisher,
} from './scheduled-publishing-types';

const unnamedArticle = 'Bài viết không tên';

export class ScheduledPublishingModule {
  constructor(
    private readonly repository: ScheduledPublishingRepository,
    private readonly publisher: SocialPublisher,
    private readonly notifier: PublicationNotifier,
    private readonly now: () => Date = () => new Date()
  ) {}

  list() {
    return this.repository.list();
  }

  async listPaginated(
    page: number = 1,
    limit: number = 20,
    filters?: { platforms?: string[]; status?: string; sortOrder?: 'asc' | 'desc' }
  ) {
    const { data: rawData, count } = await this.repository.listPaginated(page, limit, filters);
    
    // Group by day (YYYY-MM-DD)
    const groupedMap = new Map<string, ScheduledPostRecord[]>();
    for (const post of rawData) {
      if (!post.scheduled_at) continue;
      const dateStr = post.scheduled_at.split('T')[0];
      if (!groupedMap.has(dateStr)) {
        groupedMap.set(dateStr, []);
      }
      groupedMap.get(dateStr)!.push(post);
    }

    const groupedData = Array.from(groupedMap.entries()).map(([date, posts]) => ({
      date,
      posts
    }));

    return {
      data: groupedData,
      meta: {
        total: count,
        page,
        limit
      }
    };
  }

  async schedule(actor: ScheduledPublishingActor, rawInput: ScheduleInput | unknown) {
    const input = parseScheduleInput(rawInput);
    const now = this.now();
    const scheduledAt = requireFutureIso(input.scheduledAt, now);
    const caption = await this.repository.findCaption(input.captionId);
    if (!caption) throw notFound('Không tìm thấy caption tương ứng');
    const platform = normalizePlatform(caption.platform);
    if (!platform) throw validation('Nền tảng đăng bài không hợp lệ');

    const message = caption.edited_content || caption.ai_content || '';
    if (platform === 'thread' && message.length > 500) {
      throw validation('Nội dung bài đăng Threads không được vượt quá 500 ký tự');
    }
    if (platform === 'instagram' && message.length > 2200) {
      throw validation('Nội dung bài đăng Instagram không được vượt quá 2200 ký tự');
    }
    const imageUrls = input.imageUrls || (input.mediaUrl ? [input.mediaUrl] : []);
    if (platform === 'instagram' && !isHttpUrl(imageUrls[0])) {
      throw validation('Instagram yêu cầu một đường dẫn hình ảnh (mediaUrl) hợp lệ');
    }

    const existing = await this.repository.findPendingByCaption(input.captionId);
    const timestamp = now.toISOString();
    const post = existing
      ? await this.repository.update(existing.id, {
          scheduled_at: scheduledAt, image_urls: imageUrls, updated_at: timestamp,
        })
      : await this.repository.insert({
          caption_id: input.captionId,
          created_by: actor.userId,
          platform,
          status: 'pending',
          scheduled_at: scheduledAt,
          image_urls: imageUrls,
          created_at: timestamp,
          updated_at: timestamp,
        });
    await this.repository.updateCaptionStatus(input.captionId, 'scheduled');
    await this.notifySchedulingBestEffort({
      kind: 'scheduled', userId: actor.userId,
      articleTitle: caption.articles?.title || unnamedArticle, post,
    });
    return { post, status: existing ? 200 : 201 };
  }

  async publishNow(actor: ScheduledPublishingActor, rawInput: PublishNowInput | unknown) {
    const input = parsePublishNowInput(rawInput);
    const now = this.now();
    const caption = await this.repository.findCaption(input.captionId);
    if (!caption) throw notFound('Không tìm thấy caption tương ứng');
    if (actor.role !== 'admin' && caption.created_by !== actor.userId) {
      throw new ScheduledPublishingError(
        'FORBIDDEN', 403, 'Bạn không có quyền đăng caption này'
      );
    }
    const platform = normalizePlatform(caption.platform);
    if (!platform) throw validation('Nền tảng đăng bài không hợp lệ');

    const message = caption.edited_content || caption.ai_content || '';
    if (platform === 'thread' && message.length > 500) {
      throw validation('Nội dung bài đăng Threads không được vượt quá 500 ký tự');
    }
    if (platform === 'instagram' && message.length > 2200) {
      throw validation('Nội dung bài đăng Instagram không được vượt quá 2200 ký tự');
    }
    const imageUrls = input.imageUrls || (input.mediaUrl ? [input.mediaUrl] : []);
    if (platform === 'instagram' && !isHttpUrl(imageUrls[0])) {
      throw validation('Instagram yêu cầu một đường dẫn hình ảnh (mediaUrl) hợp lệ');
    }

    const linked = await this.repository.findLinkedAccount(actor.userId, platform);
    if (!hasPublicationCredentials(platform, linked)) {
      throw notFound(`Chưa kết nối tài khoản ${platformName(platform)}`);
    }

    const timestamp = now.toISOString();
    const post = await this.repository.insert({
      caption_id: input.captionId,
      created_by: actor.userId,
      platform,
      status: 'pending',
      scheduled_at: timestamp,
      image_urls: imageUrls,
      created_at: timestamp,
      updated_at: timestamp,
    });
    if (!await this.repository.claimPending(post.id, timestamp)) {
      throw conflict('Bài đăng đã được xử lý bởi tiến trình khác');
    }

    const result = await this.publishClaimed({
      ...post,
      captions: caption,
      users: { id: actor.userId },
    }, linked);
    if (!result.success) {
      throw new ScheduledPublishingError(
        'PUBLICATION_FAILED', 502, result.error
      );
    }
    const persisted = await this.repository.findById(post.id);
    return {
      post: persisted || {
        ...post,
        status: 'posted' as const,
        posted_at: timestamp,
      },
      externalPostId: result.postId,
      platform,
      publishedAt: timestamp,
    };
  }

  async reschedule(
    actor: ScheduledPublishingActor,
    id: string,
    rawInput: RescheduleInput | unknown
  ) {
    const input = parseRescheduleInput(rawInput);
    const now = this.now();
    const scheduledAt = requireFutureIso(input.scheduledAt, now);
    const post = await this.requirePost(id);
    this.requireOwner(actor, post);
    this.requirePending(post);
    const updated = await this.repository.updatePending(id, {
      scheduled_at: scheduledAt, updated_at: now.toISOString(),
    });
    if (!updated) throw conflict('Lịch đăng bài đã thay đổi, vui lòng tải lại dữ liệu');
    await this.notifySchedulingBestEffort({
      kind: 'rescheduled', userId: actor.userId,
      articleTitle: updated.captions?.articles?.title || unnamedArticle, post: updated,
    });
    return updated;
  }

  async bulkReschedule(
    actor: ScheduledPublishingActor,
    rawInput: BulkRescheduleInput | unknown
  ) {
    const input = parseBulkRescheduleInput(rawInput);
    const now = this.now();
    const scheduledAt = requireFutureIso(input.scheduledAt, now);
    const posts = await this.repository.findByIds(input.ids);
    if (posts.length !== input.ids.length) {
      throw notFound('Không tìm thấy một hoặc nhiều lịch đăng bài');
    }
    posts.forEach((post) => {
      this.requireOwner(actor, post);
      this.requirePending(post);
    });
    const updated = await this.repository.updatePendingMany(input.ids, {
      scheduled_at: scheduledAt, updated_at: now.toISOString(),
    });
    if (updated.length !== input.ids.length) {
      throw conflict('Một hoặc nhiều lịch đăng bài đã thay đổi, vui lòng tải lại dữ liệu');
    }
    await Promise.all(updated.map((post) => this.notifySchedulingBestEffort({
      kind: 'rescheduled', userId: actor.userId,
      articleTitle: post.captions?.articles?.title || unnamedArticle, post,
    })));
    return updated;
  }

  async cancel(actor: ScheduledPublishingActor, id: string) {
    const post = await this.requirePost(id);
    this.requireOwner(actor, post);
    if (post.status !== 'pending') {
      throw conflict(`Không thể hủy lịch đăng bài ở trạng thái: ${post.status}`);
    }
    const updated = await this.repository.updatePending(id, {
      status: 'cancelled', updated_at: this.now().toISOString(),
    });
    if (!updated) throw conflict('Lịch đăng bài đã thay đổi, vui lòng tải lại dữ liệu');
    if (post.caption_id) await this.repository.updateCaptionStatus(post.caption_id, 'approved');
    return { success: true as const, message: 'Đã hủy lịch đăng bài thành công' };
  }

  async calendarEvents(filters: CalendarFilters) {
    return projectCalendarEvents(await this.repository.listCalendar(filters));
  }

  async calendarCsv(filters: CalendarFilters) {
    return serializeCalendarCsv(await this.repository.listCalendar(filters));
  }

  async calendarIcal(filters: CalendarFilters) {
    return serializeCalendarIcal(await this.repository.listCalendar(filters), this.now());
  }

  async runPublicationCycle() {
    const cycleNow = this.now();
    const posts = await this.repository.findDue(cycleNow.toISOString());
    let processed = 0;
    for (const post of posts) {
      try {
        if (!await this.repository.claimPending(post.id, this.now().toISOString())) continue;
        await this.publishClaimed(post);
        processed += 1;
      } catch (error) {
        console.error(`[Scheduled Publishing] Failed to process ${post.id}:`, error);
      }
    }
    return { due: posts.length, processed };
  }

  private async publishClaimed(
    post: ScheduledPostRecord,
    resolvedLinked?: Awaited<ReturnType<ScheduledPublishingRepository['findLinkedAccount']>>
  ) {
    const caption = post.captions;
    const platform = normalizePlatform(post.platform || caption?.platform || 'facebook') || 'facebook';
    const userId = post.users?.id || post.created_by;
    const linked = resolvedLinked ?? (userId
      ? await this.repository.findLinkedAccount(userId, platform)
      : null);
    let result: PublicationResult;
    try {
      result = await this.publisher.publish({
        platform,
        message: caption?.edited_content || caption?.ai_content || '',
        imageUrls: post.image_urls || [],
        accessToken: linked?.access_token || undefined,
        accountId: linked?.account_id || undefined,
      });
    } catch (error) {
      result = { success: false, error: error instanceof Error ? error.message : 'Lỗi đăng bài' };
    }
    const timestamp = this.now().toISOString();
    if (result.success) {
      const externalIdField = platform === 'thread'
        ? 'threads_post_id'
        : platform === 'instagram' ? 'instagram_media_id' : 'fb_post_id';
      await this.repository.markPosted(post.id, {
        status: 'posted',
        [externalIdField]: result.postId,
        post_result: result,
        updated_at: timestamp,
      });
      if (caption?.id) await this.repository.updateCaptionStatus(caption.id, 'posted');
    } else {
      await this.repository.markFailed(post.id, {
        status: 'failed', posted_at: null, failed_at: timestamp,
        failure_reason: result.error, post_result: result, updated_at: timestamp,
      });
    }
    await this.notifyPublicationBestEffort({
      userId,
      userEmail: post.users?.email || '',
      postTitle: caption?.articles?.title || unnamedArticle,
      platformName: platformName(platform),
      post,
      result,
    });
    return result;
  }

  private async requirePost(id: string) {
    const post = await this.repository.findById(id);
    if (!post) throw notFound('Không tìm thấy lịch đăng bài');
    return post;
  }

  private requireOwner(actor: ScheduledPublishingActor, post: ScheduledPostRecord) {
    if (actor.role !== 'admin' && post.created_by !== actor.userId) {
      throw new ScheduledPublishingError(
        'FORBIDDEN', 403, 'Bạn không có quyền thao tác với lịch đăng bài này'
      );
    }
  }

  private requirePending(post: ScheduledPostRecord) {
    if (post.status !== 'pending') {
      throw conflict(`Không thể thay đổi lịch đăng bài ở trạng thái: ${post.status}`);
    }
  }

  private async notifySchedulingBestEffort(
    input: Parameters<PublicationNotifier['scheduling']>[0]
  ) {
    try { await this.notifier.scheduling(input); }
    catch (error) { console.error('[Scheduled Publishing] Scheduling notification failed:', error); }
  }

  private async notifyPublicationBestEffort(
    input: Parameters<PublicationNotifier['publication']>[0]
  ) {
    try { await this.notifier.publication(input); }
    catch (error) { console.error('[Scheduled Publishing] Publication notification failed:', error); }
  }
}

function validation(message: string) {
  return new ScheduledPublishingError('VALIDATION', 400, message);
}

function notFound(message: string) {
  return new ScheduledPublishingError('NOT_FOUND', 404, message);
}

function conflict(message: string) {
  return new ScheduledPublishingError('CONFLICT', 409, message);
}

function isHttpUrl(value?: string) {
  if (!value) return false;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
}

function platformName(platform: string) {
  return platform === 'facebook' ? 'Facebook' : platform === 'instagram' ? 'Instagram' : 'Threads';
}

function hasPublicationCredentials(
  platform: string,
  linked: { access_token?: string | null; account_id?: string | null } | null
) {
  if (!linked?.access_token) return false;
  if (platform === 'facebook' || platform === 'instagram') return Boolean(linked.account_id);
  return true;
}
