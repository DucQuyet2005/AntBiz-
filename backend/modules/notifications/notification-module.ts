import { NotificationError } from './errors';
import { buildNotificationFilter } from './notification-filters';
import {
  parseCreateNotification,
  parseNotificationId,
  parseNotificationList,
} from './notification-schemas';
import type { NotificationRepository } from './notification-types';

export class NotificationModule {
  constructor(private readonly repository: NotificationRepository) {}

  async listInbox(userId: string, rawInput: Parameters<typeof parseNotificationList>[0]) {
    const input = parseNotificationList(rawInput);
    const role = await this.repository.findUserRole(userId);
    const filter = buildNotificationFilter(role, input.category);
    if (filter.kind === 'empty') {
      return { data: [], count: 0, page: input.page, limit: input.limit, totalPages: 0 };
    }
    const result = await this.repository.list(userId, input.page, input.limit, filter);
    return {
      ...result,
      page: input.page,
      limit: input.limit,
      totalPages: Math.ceil(result.count / input.limit),
    };
  }

  async createForUser(callerId: string, rawInput: unknown) {
    const input = parseCreateNotification(rawInput);
    if (input.userId !== callerId) {
      const role = await this.repository.findUserRole(callerId);
      if (role !== 'admin') {
        throw new NotificationError(
          'FORBIDDEN', 403,
          'Bạn không có quyền tạo thông báo cho người dùng khác'
        );
      }
    }
    return this.repository.insert(input);
  }

  async createInternal(rawInput: unknown) {
    return this.repository.insert(parseCreateNotification(rawInput));
  }

  async createManyInternal(rawInputs: unknown[]) {
    if (!rawInputs?.length) return [];
    const inputs = rawInputs.map(parseCreateNotification);
    return this.repository.insertMany(inputs);
  }

  async markRead(userId: string, rawId: unknown) {
    const id = parseNotificationId(rawId);
    const notification = await this.repository.markRead(userId, id);
    if (!notification) {
      throw new NotificationError('NOT_FOUND', 404, 'Không tìm thấy thông báo');
    }
    return notification;
  }

  markAllRead(userId: string) {
    return this.repository.markAllRead(userId);
  }
}
