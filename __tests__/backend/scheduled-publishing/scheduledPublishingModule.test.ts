import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduledPublishingModule } from '@/backend/modules/scheduled-publishing/scheduled-publishing-module';
import { ScheduledPublishingError } from '@/backend/modules/scheduled-publishing/errors';
import type {
  PublicationNotifier,
  ScheduledPostRecord,
  ScheduledPublishingRepository,
  SocialPublisher,
} from '@/backend/modules/scheduled-publishing/scheduled-publishing-types';

const now = new Date('2026-07-15T08:00:00.000Z');
const actor = { userId: 'u1', role: 'marketer_full' };

describe('ScheduledPublishingModule', () => {
  let repository: ScheduledPublishingRepository;
  let publisher: SocialPublisher;
  let notifier: PublicationNotifier;
  let module: ScheduledPublishingModule;

  beforeEach(() => {
    repository = makeRepository();
    publisher = { publish: vi.fn().mockResolvedValue({ success: true, postId: 'external-1' }) };
    notifier = {
      scheduling: vi.fn().mockResolvedValue(undefined),
      publication: vi.fn().mockResolvedValue(undefined),
    };
    module = new ScheduledPublishingModule(repository, publisher, notifier, () => now);
  });

  it('creates a future schedule and synchronizes the caption status', async () => {
    vi.mocked(repository.findCaption).mockResolvedValue({
      id: 'c1', platform: 'facebook', ai_content: 'Caption', articles: { title: 'Article' },
    });
    vi.mocked(repository.insert).mockResolvedValue(post());

    const result = await module.schedule(actor, {
      captionId: 'c1', scheduledAt: '2026-07-15T09:00:00.000Z',
    });

    expect(result.status).toBe(201);
    expect(repository.insert).toHaveBeenCalledWith(expect.objectContaining({
      caption_id: 'c1', created_by: 'u1', platform: 'facebook', status: 'pending',
    }));
    expect(repository.updateCaptionStatus).toHaveBeenCalledWith('c1', 'scheduled');
    expect(notifier.scheduling).toHaveBeenCalled();
  });

  it('updates an existing pending schedule instead of inserting another', async () => {
    vi.mocked(repository.findCaption).mockResolvedValue({ id: 'c1', platform: 'facebook' });
    vi.mocked(repository.findPendingByCaption).mockResolvedValue(post());
    vi.mocked(repository.update).mockResolvedValue(post({ scheduled_at: '2026-07-15T10:00:00.000Z' }));

    const result = await module.schedule(actor, {
      captionId: 'c1', scheduledAt: '2026-07-15T10:00:00.000Z',
    });

    expect(result.status).toBe(200);
    expect(repository.update).toHaveBeenCalledWith('sp1', expect.any(Object));
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it('rejects an Instagram schedule without an HTTP image', async () => {
    vi.mocked(repository.findCaption).mockResolvedValue({ id: 'c1', platform: 'instagram' });
    await expect(module.schedule(actor, {
      captionId: 'c1', scheduledAt: '2026-07-15T10:00:00.000Z', mediaUrl: 'file:///x.png',
    })).rejects.toMatchObject({ code: 'VALIDATION', status: 400 });
  });

  it('rejects past rescheduling before persistence', async () => {
    await expect(module.reschedule(actor, 'sp1', {
      scheduledAt: '2026-07-15T07:59:00.000Z',
    })).rejects.toMatchObject({ code: 'VALIDATION', status: 400 });
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('only allows the creator or an admin to reschedule', async () => {
    vi.mocked(repository.findById).mockResolvedValue(post({ created_by: 'u2' }));
    await expect(module.reschedule(actor, 'sp1', {
      scheduledAt: '2026-07-15T09:00:00.000Z',
    })).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('returns a conflict when a requested bulk update loses a race', async () => {
    vi.mocked(repository.findByIds).mockResolvedValue([post(), post({ id: 'sp2' })]);
    vi.mocked(repository.updatePendingMany).mockResolvedValue([post()]);
    await expect(module.bulkReschedule(actor, {
      ids: ['sp1', 'sp2'], scheduledAt: '2026-07-15T09:00:00.000Z',
    })).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
  });

  it('cancels only pending posts and restores the caption', async () => {
    vi.mocked(repository.findById).mockResolvedValue(post());
    vi.mocked(repository.updatePending).mockResolvedValue(post({ status: 'cancelled' }));
    await expect(module.cancel(actor, 'sp1')).resolves.toMatchObject({ success: true });
    expect(repository.updateCaptionStatus).toHaveBeenCalledWith('c1', 'approved');
  });

  it('marks missing Threads credentials as failed without calling the provider helper', async () => {
    const threadsPublisher: SocialPublisher = {
      publish: vi.fn().mockResolvedValue({
        success: false, error: 'Tài khoản Threads chưa được kết nối hoặc thiếu access token',
      }),
    };
    module = new ScheduledPublishingModule(repository, threadsPublisher, notifier, () => now);
    vi.mocked(repository.findDue).mockResolvedValue([post({
      platform: 'thread', captions: { id: 'c1', platform: 'thread', ai_content: 'Text' },
    })]);
    vi.mocked(repository.claimPending).mockResolvedValue(true);

    await module.runPublicationCycle();

    expect(repository.markFailed).toHaveBeenCalledWith('sp1', expect.objectContaining({
      status: 'failed', posted_at: null,
    }));
    expect(repository.updateCaptionStatus).not.toHaveBeenCalled();
  });

  it('continues the due batch after one post throws', async () => {
    vi.mocked(repository.findDue).mockResolvedValue([post(), post({ id: 'sp2' })]);
    vi.mocked(repository.claimPending).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    vi.mocked(repository.findLinkedAccount).mockRejectedValueOnce(new Error('db down'));

    const result = await module.runPublicationCycle();

    expect(repository.claimPending).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ due: 2, processed: 1 });
    expect(repository.markPosted).toHaveBeenCalledWith('sp2', expect.objectContaining({
      status: 'posted', fb_post_id: 'external-1',
    }));
  });

  it('does not let notification failures change a successful publication', async () => {
    vi.mocked(repository.findDue).mockResolvedValue([post()]);
    vi.mocked(repository.claimPending).mockResolvedValue(true);
    vi.mocked(notifier.publication).mockRejectedValue(new Error('notify down'));

    await expect(module.runPublicationCycle()).resolves.toEqual({ due: 1, processed: 1 });
    expect(repository.markPosted).toHaveBeenCalled();
  });
});

function makeRepository(): ScheduledPublishingRepository {
  return {
    list: vi.fn().mockResolvedValue([]),
    findCaption: vi.fn().mockResolvedValue(null),
    findPendingByCaption: vi.fn().mockResolvedValue(null),
    insert: vi.fn(), update: vi.fn(), findById: vi.fn().mockResolvedValue(null),
    findByIds: vi.fn().mockResolvedValue([]),
    updatePending: vi.fn().mockResolvedValue(null),
    updatePendingMany: vi.fn().mockResolvedValue([]),
    updateCaptionStatus: vi.fn().mockResolvedValue(undefined),
    listCalendar: vi.fn().mockResolvedValue([]),
    findDue: vi.fn().mockResolvedValue([]),
    claimPending: vi.fn().mockResolvedValue(false),
    findLinkedAccount: vi.fn().mockResolvedValue(null),
    markPosted: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
  };
}
function post(overrides: Partial<ScheduledPostRecord> = {}): ScheduledPostRecord {
  return {
    id: 'sp1', caption_id: 'c1', created_by: 'u1', platform: 'facebook',
    status: 'pending', scheduled_at: '2026-07-15T09:00:00.000Z', image_urls: [],
    captions: { id: 'c1', platform: 'facebook', ai_content: 'Caption' },
    users: { id: 'u1', email: 'user@example.com' },
    ...overrides,
  };
}
