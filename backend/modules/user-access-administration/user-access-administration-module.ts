import { UserAccessAdministrationError } from './user-access-administration-errors';
import {
  parseRoleMutation,
  parseStatusMutation,
  parseTargetUserId,
  parseUserList,
} from './user-access-administration-schemas';
import type {
  AdministratorActor,
  MutationResult,
  UserAccessAdministrationRepository,
  UserAccessEffects,
} from './user-access-administration-types';

export class UserAccessAdministrationModule {
  constructor(
    private readonly repository: UserAccessAdministrationRepository,
    private readonly effects: UserAccessEffects,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  async listUsers(rawInput: Parameters<typeof parseUserList>[0]) {
    const input = parseUserList(rawInput);
    const result = await this.repository.list(input);
    return {
      data: result.data,
      meta: {
        total: result.count,
        page: input.page,
        limit: input.limit,
        totalPages: result.count ? Math.ceil(result.count / input.limit) : 0,
      },
    };
  }

  async assignRole(
    actor: AdministratorActor,
    rawTargetId: unknown,
    rawInput: unknown
  ): Promise<MutationResult> {
    const targetId = parseTargetUserId(rawTargetId);
    const { role } = parseRoleMutation(rawInput);
    this.assertNotSelf(actor.id, targetId, 'Bạn không thể thay đổi vai trò của chính mình');

    const target = await this.findTarget(targetId);
    if (target.role === role) return { unchanged: true };

    await this.repository.updateRole(targetId, role);
    await this.runEffect('roleChanged', actor.id, targetId, () => this.effects.roleChanged({
      actor,
      target,
      previousRole: target.role,
      role,
    }));
    return { unchanged: false };
  }

  async changeStatus(
    actor: AdministratorActor,
    rawTargetId: unknown,
    rawInput: unknown
  ): Promise<MutationResult> {
    const targetId = parseTargetUserId(rawTargetId);
    const input = parseStatusMutation(rawInput);
    this.assertNotSelf(actor.id, targetId, 'Bạn không thể thay đổi trạng thái của chính mình');

    const target = await this.findTarget(targetId);
    const unchanged = input.status === 'locked'
      ? target.status === 'locked' && target.locked_reason === input.lockedReason
      : target.status === 'active'
        && target.locked_reason === null
        && target.locked_at === null
        && target.locked_by === null;
    if (unchanged) return { unchanged: true };

    await this.repository.updateStatus(targetId, {
      status: input.status,
      lockedReason: input.lockedReason,
      lockedAt: input.status === 'locked' ? this.now() : null,
      lockedBy: input.status === 'locked' ? actor.id : null,
    });
    await this.runEffect('statusChanged', actor.id, targetId, () => this.effects.statusChanged({
      actor,
      target,
      previousStatus: target.status,
      status: input.status,
      lockedReason: input.lockedReason,
    }));
    return { unchanged: false };
  }

  private async findTarget(targetId: string) {
    const target = await this.repository.findById(targetId);
    if (!target) {
      throw new UserAccessAdministrationError('NOT_FOUND', 404, 'Không tìm thấy người dùng');
    }
    return target;
  }

  private assertNotSelf(actorId: string, targetId: string, message: string) {
    if (actorId === targetId) {
      throw new UserAccessAdministrationError('FORBIDDEN', 403, message);
    }
  }

  private async runEffect(
    effect: string,
    actorId: string,
    targetId: string,
    run: () => Promise<void>
  ) {
    try {
      await run();
    } catch (error) {
      console.error('[UserAccessAdministration] Supporting effect failed', {
        effect,
        actorId,
        targetId,
        error,
      });
    }
  }
}
