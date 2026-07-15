import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(() => ({ kind: 'admin' })),
  module: {
    createInternal: vi.fn(),
    createManyInternal: vi.fn(),
  },
}));

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock('@/backend/modules/notifications/notification-factory', () => ({
  createNotificationModule: vi.fn(() => mocks.module),
}));

import {
  createNotification,
  createNotifications,
} from '@/lib/services/notificationService';

describe('notificationService compatibility exports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.module.createInternal.mockResolvedValue({ id: 'n1' });
    mocks.module.createManyInternal.mockResolvedValue([{ id: 'n1' }]);
  });

  it('delegates single creation to an admin-backed module', async () => {
    const input = { userId: 'u1', type: 'info' as const, title: 'T', message: 'M' };
    await expect(createNotification(input)).resolves.toEqual({ id: 'n1' });
    expect(mocks.createAdminClient).toHaveBeenCalled();
    expect(mocks.module.createInternal).toHaveBeenCalledWith(input);
  });

  it('preserves empty and non-empty bulk behavior', async () => {
    await expect(createNotifications([])).resolves.toEqual([]);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    const input = [{ userId: 'u1', type: 'info' as const, title: 'T', message: 'M' }];
    await expect(createNotifications(input)).resolves.toEqual([{ id: 'n1' }]);
    expect(mocks.module.createManyInternal).toHaveBeenCalledWith(input);
  });
});
