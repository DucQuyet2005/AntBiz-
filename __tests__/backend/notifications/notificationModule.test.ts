import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationModule } from '@/backend/modules/notifications/notification-module';
import type {
  CreateNotificationInput,
  NotificationRecord,
  NotificationRepository,
} from '@/backend/modules/notifications/notification-types';

describe('NotificationModule', () => {
  let repository: NotificationRepository;
  let module: NotificationModule;

  beforeEach(() => {
    repository = makeRepository();
    module = new NotificationModule(repository);
  });

  it('lists a paged inbox and calculates total pages', async () => {
    vi.mocked(repository.findUserRole).mockResolvedValue('marketer_full');
    vi.mocked(repository.list).mockResolvedValue({ data: [notification()], count: 21 });
    const result = await module.listInbox('u1', {
      page: '2', limit: '10', category: 'all',
    });
    expect(result).toMatchObject({ count: 21, page: 2, limit: 10, totalPages: 3 });
    expect(repository.list).toHaveBeenCalledWith('u1', 2, 10, { kind: 'all' });
  });

  it('returns an empty admin post category without a list query', async () => {
    vi.mocked(repository.findUserRole).mockResolvedValue('admin');
    await expect(module.listInbox('admin-1', { category: 'bai-dang' })).resolves.toEqual({
      data: [], count: 0, page: 1, limit: 10, totalPages: 0,
    });
    expect(repository.list).not.toHaveBeenCalled();
  });

  it.each(['0', '-1', '1.5', 'abc'])('rejects invalid pagination %s', async (page) => {
    await expect(module.listInbox('u1', { page })).rejects.toMatchObject({
      code: 'VALIDATION', status: 400,
    });
  });

  it('allows a user to create a notification for themselves', async () => {
    vi.mocked(repository.insert).mockResolvedValue(notification());
    await module.createForUser('u1', createInput());
    expect(repository.findUserRole).not.toHaveBeenCalled();
    expect(repository.insert).toHaveBeenCalled();
  });

  it('forbids cross-user creation by a non-admin without writing', async () => {
    vi.mocked(repository.findUserRole).mockResolvedValue('marketer_content');
    await expect(module.createForUser('u1', createInput({ userId: 'u2' })))
      .rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it('allows persisted admins to create for another user', async () => {
    vi.mocked(repository.findUserRole).mockResolvedValue('admin');
    vi.mocked(repository.insert).mockResolvedValue(notification({ user_id: 'u2' }));
    await module.createForUser('admin-1', createInput({ userId: 'u2' }));
    expect(repository.insert).toHaveBeenCalled();
  });

  it('rejects unsupported types before persistence', async () => {
    await expect(module.createInternal({
      ...createInput(), type: 'security_alert',
    })).rejects.toMatchObject({ code: 'VALIDATION', status: 400 });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it('validates all bulk inputs before inserting', async () => {
    await expect(module.createManyInternal([
      createInput(), { ...createInput(), type: 'invalid' },
    ])).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(repository.insertMany).not.toHaveBeenCalled();
  });

  it('returns an empty bulk result without persistence', async () => {
    await expect(module.createManyInternal([])).resolves.toEqual([]);
    expect(repository.insertMany).not.toHaveBeenCalled();
  });

  it('marks one owned notification read and maps an absent row to not found', async () => {
    vi.mocked(repository.markRead).mockResolvedValueOnce(notification({ is_read: true }));
    await expect(module.markRead('u1', 'n1')).resolves.toMatchObject({ is_read: true });
    vi.mocked(repository.markRead).mockResolvedValueOnce(null);
    await expect(module.markRead('u1', 'foreign')).rejects.toMatchObject({
      code: 'NOT_FOUND', status: 404,
    });
  });

  it('returns the changed count from mark-all', async () => {
    vi.mocked(repository.markAllRead).mockResolvedValue(3);
    await expect(module.markAllRead('u1')).resolves.toBe(3);
  });
});

function makeRepository(): NotificationRepository {
  return {
    findUserRole: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue({ data: [], count: 0 }),
    insert: vi.fn(), insertMany: vi.fn(),
    markRead: vi.fn().mockResolvedValue(null),
    markAllRead: vi.fn().mockResolvedValue(0),
    getUserSettings: vi.fn().mockResolvedValue(null),
    updateUserSettings: vi.fn().mockResolvedValue(null as any),
    findUnsentEmailNotifications: vi.fn().mockResolvedValue([]),
    markEmailsAsSent: vi.fn().mockResolvedValue(undefined),
    findUsersForDigest: vi.fn().mockResolvedValue([]),
  };
}

function createInput(
  overrides: Partial<CreateNotificationInput> = {}
): CreateNotificationInput {
  return { userId: 'u1', type: 'info', title: 'Title', message: 'Message', ...overrides };
}

function notification(overrides: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    id: 'n1', user_id: 'u1', type: 'info', title: 'Title', message: 'Message',
    is_read: false, metadata: {}, created_at: '2026-07-15T00:00:00.000Z',
    email_sent: false,
    ...overrides,
  };
}
