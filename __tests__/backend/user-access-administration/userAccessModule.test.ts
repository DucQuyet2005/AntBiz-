import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserAccessAdministrationModule } from '@/backend/modules/user-access-administration/user-access-administration-module';
import type {
  AdministratorActor,
  UserAccessAdministrationRepository,
  UserAccessEffects,
  UserAccessState,
} from '@/backend/modules/user-access-administration/user-access-administration-types';

describe('UserAccessAdministrationModule', () => {
  let repository: UserAccessAdministrationRepository;
  let effects: UserAccessEffects;
  let accessModule: UserAccessAdministrationModule;

  beforeEach(() => {
    repository = makeRepository();
    effects = { roleChanged: vi.fn(), statusChanged: vi.fn() };
    accessModule = new UserAccessAdministrationModule(
      repository,
      effects,
      () => '2026-07-15T12:00:00.000Z'
    );
  });

  it('lists users with normalized filters and pagination metadata', async () => {
    vi.mocked(repository.list).mockResolvedValue({ data: [], count: 21 });
    await expect(accessModule.listUsers({
      search: '  example  ', role: 'admin', status: 'active', page: '2', limit: '10',
    })).resolves.toMatchObject({ meta: { total: 21, page: 2, limit: 10, totalPages: 3 } });
    expect(repository.list).toHaveBeenCalledWith({
      search: 'example', role: 'admin', status: 'active', page: 2, limit: 10,
    });
  });

  it('assigns a changed role and then emits the supporting effect', async () => {
    vi.mocked(repository.findById).mockResolvedValue(target());
    await expect(accessModule.assignRole(actor(), 'u2', { role: 'admin' }))
      .resolves.toEqual({ unchanged: false });
    expect(repository.updateRole).toHaveBeenCalledWith('u2', 'admin');
    expect(effects.roleChanged).toHaveBeenCalledWith(expect.objectContaining({
      previousRole: 'marketer_full', role: 'admin',
    }));
  });

  it('returns a role no-op without persistence or effects', async () => {
    vi.mocked(repository.findById).mockResolvedValue(target());
    await expect(accessModule.assignRole(actor(), 'u2', { role: 'marketer_full' }))
      .resolves.toEqual({ unchanged: true });
    expect(repository.updateRole).not.toHaveBeenCalled();
    expect(effects.roleChanged).not.toHaveBeenCalled();
  });

  it('forbids self role and status mutations before target lookup', async () => {
    await expect(accessModule.assignRole(actor(), 'admin-1', { role: 'marketer_full' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    await expect(accessModule.changeStatus(actor(), 'admin-1', {
      status: 'locked', locked_reason: 'A sufficiently long reason',
    })).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('maps a missing target to not found without mutation', async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);
    await expect(accessModule.assignRole(actor(), 'missing', { role: 'admin' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    expect(repository.updateRole).not.toHaveBeenCalled();
  });

  it('locks with normalized metadata and emits effects after persistence', async () => {
    vi.mocked(repository.findById).mockResolvedValue(target());
    await accessModule.changeStatus(actor(), 'u2', {
      status: 'locked', locked_reason: '  repeated policy abuse  ',
    });
    expect(repository.updateStatus).toHaveBeenCalledWith('u2', {
      status: 'locked',
      lockedReason: 'repeated policy abuse',
      lockedAt: '2026-07-15T12:00:00.000Z',
      lockedBy: 'admin-1',
    });
    expect(effects.statusChanged).toHaveBeenCalledWith(expect.objectContaining({
      previousStatus: 'active', status: 'locked', lockedReason: 'repeated policy abuse',
    }));
  });

  it('restores access and clears all lock metadata', async () => {
    vi.mocked(repository.findById).mockResolvedValue(target({
      status: 'locked', locked_reason: 'Repeated policy abuse',
      locked_at: '2026-07-14T00:00:00.000Z', locked_by: 'admin-2',
    }));
    await accessModule.changeStatus(actor(), 'u2', { status: 'active' });
    expect(repository.updateStatus).toHaveBeenCalledWith('u2', {
      status: 'active', lockedReason: null, lockedAt: null, lockedBy: null,
    });
  });

  it('returns status no-ops without effects', async () => {
    vi.mocked(repository.findById).mockResolvedValueOnce(target());
    await expect(accessModule.changeStatus(actor(), 'u2', { status: 'active' }))
      .resolves.toEqual({ unchanged: true });
    vi.mocked(repository.findById).mockResolvedValueOnce(target({
      status: 'locked', locked_reason: 'Repeated policy abuse',
    }));
    await expect(accessModule.changeStatus(actor(), 'u2', {
      status: 'locked', locked_reason: 'Repeated policy abuse',
    })).resolves.toEqual({ unchanged: true });
    expect(repository.updateStatus).not.toHaveBeenCalled();
    expect(effects.statusChanged).not.toHaveBeenCalled();
  });

  it('contains effect failures after a successful primary update', async () => {
    vi.mocked(repository.findById).mockResolvedValue(target());
    vi.mocked(effects.roleChanged).mockRejectedValue(new Error('notification unavailable'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(accessModule.assignRole(actor(), 'u2', { role: 'admin' }))
      .resolves.toEqual({ unchanged: false });
    expect(repository.updateRole).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('does not emit effects when persistence fails', async () => {
    vi.mocked(repository.findById).mockResolvedValue(target());
    vi.mocked(repository.updateRole).mockRejectedValue(new Error('write failed'));
    await expect(accessModule.assignRole(actor(), 'u2', { role: 'admin' })).rejects.toThrow('write failed');
    expect(effects.roleChanged).not.toHaveBeenCalled();
  });
});

function makeRepository(): UserAccessAdministrationRepository {
  return {
    list: vi.fn().mockResolvedValue({ data: [], count: 0 }),
    findById: vi.fn().mockResolvedValue(null),
    updateRole: vi.fn(),
    updateStatus: vi.fn(),
  };
}

function actor(): AdministratorActor {
  return { id: 'admin-1', email: 'admin@example.com' };
}

function target(overrides: Partial<UserAccessState> = {}): UserAccessState {
  return {
    id: 'u2', email: 'user@example.com', role: 'marketer_full', status: 'active',
    locked_reason: null, locked_at: null, locked_by: null, ...overrides,
  };
}
