import {
  PromptModuleError,
  PromptRepositoryError,
  getErrorMessage,
} from './errors';
import { normalizePromptPlatform } from './prompt-schemas';
import type { CreatePromptInput, UpdatePromptInput } from './prompt-schemas';
import type {
  PromptActor,
  PromptListInput,
  PromptListResult,
  PromptNotifier,
  PromptRecord,
  PromptRepository,
} from './prompt-types';

const MAX_NAME_LENGTH = 200;

export class PromptModule {
  constructor(
    private readonly repository: PromptRepository,
    private readonly notify?: PromptNotifier
  ) {}

  async list(actor: PromptActor, input: PromptListInput): Promise<PromptListResult> {
    try {
      return await this.repository.list(input, actor.role === 'admin' ? undefined : actor.id);
    } catch (error) {
      throw this.persistenceFailure('Không thể tải danh sách prompt', error, { actorId: actor.id });
    }
  }

  async create(actor: PromptActor, input: CreatePromptInput): Promise<PromptRecord> {
    try {
      if (input.is_default === true) {
        await this.repository.clearDefaults(actor.id, input.platform);
      }

      const prompt = await this.repository.create({ ...input, created_by: actor.id });
      await this.notifyCreated(actor, prompt);
      return prompt;
    } catch (error) {
      if (error instanceof PromptModuleError) throw error;
      throw this.persistenceFailure('Không thể tạo prompt', error, { actorId: actor.id });
    }
  }

  async get(actor: PromptActor, id: string): Promise<PromptRecord> {
    const prompt = await this.loadActive(id, 'Không thể tải prompt');
    this.assertOwnerOrAdmin(actor, prompt, 'Bạn không có quyền xem prompt này');
    return prompt;
  }

  async update(actor: PromptActor, id: string, input: UpdatePromptInput): Promise<PromptRecord> {
    const prompt = await this.loadActive(id, 'Không thể tải prompt');
    this.assertOwnerOrAdmin(actor, prompt, 'Bạn không có quyền sửa prompt này');

    try {
      if (input.is_default === true) {
        await this.repository.clearDefaults(actor.id, input.platform || prompt.platform);
      }

      const updated = await this.repository.updateActive(id, input);
      if (!updated) {
        throw new PromptModuleError(
          'PROMPT_ACCESS_DENIED',
          'Bạn không có quyền sửa prompt này',
          undefined,
          { promptId: id, actorId: actor.id }
        );
      }
      return updated;
    } catch (error) {
      if (error instanceof PromptModuleError) throw error;
      throw this.persistenceFailure('Không thể cập nhật prompt', error, { promptId: id });
    }
  }

  async delete(actor: PromptActor, id: string): Promise<{ id: string; deleted: true }> {
    const prompt = await this.loadActive(id, 'Không thể tải prompt');
    this.assertOwnerOrAdmin(actor, prompt, 'Bạn không có quyền xóa prompt này');

    try {
      const deleted = await this.repository.softDelete(id);
      if (!deleted) {
        throw new PromptModuleError(
          'PROMPT_ACCESS_DENIED',
          'Không thể xóa prompt: hệ thống phân quyền (RLS) đã chặn thao tác này. Vui lòng đăng nhập lại rồi thử lại.',
          undefined,
          { promptId: id, actorId: actor.id, role: actor.role }
        );
      }
      return { id, deleted: true };
    } catch (error) {
      if (error instanceof PromptModuleError) throw error;
      const cause = error instanceof PromptRepositoryError ? error.cause : error;
      throw this.persistenceFailure(`Không thể xóa prompt: ${getErrorMessage(cause)}`, error, {
        promptId: id,
      });
    }
  }

  async clone(actor: PromptActor, id: string): Promise<PromptRecord> {
    const original = await this.loadActive(id, 'Không thể tải prompt gốc', 'Không tìm thấy prompt để nhân bản');
    this.assertOwnerOrAdmin(actor, original, 'Bạn không có quyền nhân bản prompt này');

    try {
      const name = `Copy of ${original.name}`.slice(0, MAX_NAME_LENGTH);
      return await this.repository.create({
        name,
        platform: normalizePromptPlatform(original.platform) as CreatePromptInput['platform'],
        content: original.content,
        tags: original.tags,
        is_default: false,
        created_by: actor.id,
        cloned_from: original.id,
      });
    } catch (error) {
      throw this.persistenceFailure('Không thể nhân bản prompt', error, { promptId: id });
    }
  }

  async recordUse(id: string): Promise<number> {
    const usageCount = await this.repository.getUsageCount(id);
    if (usageCount === null) {
      throw new PromptModuleError('PROMPT_NOT_FOUND', 'Prompt không tìm thấy', undefined, {
        promptId: id,
      });
    }

    const newCount = usageCount + 1;
    try {
      await this.repository.setUsageCount(id, newCount);
      return newCount;
    } catch (error) {
      throw this.persistenceFailure('Không thể cập nhật usage_count', error, { promptId: id });
    }
  }

  async checkUsage(actor: PromptActor, id: string): Promise<{ in_use: boolean; count: number }> {
    const prompt = await this.loadActive(id, 'Không thể kiểm tra prompt');
    this.assertOwnerOrAdmin(actor, prompt, 'Bạn không có quyền kiểm tra prompt này');

    let captionIds: string[];
    try {
      captionIds = await this.repository.findCaptionIdsByPrompt(id);
    } catch (error) {
      throw this.persistenceFailure('Không thể kiểm tra', error, { promptId: id, stage: 'captions' });
    }

    let scheduledCaptionIds: Array<string | null>;
    try {
      scheduledCaptionIds = await this.repository.findScheduledCaptionIds(['pending', 'posted']);
    } catch (error) {
      throw this.persistenceFailure('Không thể kiểm tra', error, {
        promptId: id,
        stage: 'scheduled_posts',
      });
    }

    const captionIdSet = new Set(captionIds);
    const count = scheduledCaptionIds.reduce(
      (total, captionId) => total + (captionId && captionIdSet.has(captionId) ? 1 : 0),
      0
    );

    return { in_use: count > 0, count };
  }

  async getDefault(actor: PromptActor, platform: string): Promise<PromptRecord | null> {
    const targetPlatform = normalizePromptPlatform(platform);

    try {
      const prompt = await this.repository.findDefault(actor.id, targetPlatform);
      if (prompt) return prompt;
    } catch (error) {
      throw this.persistenceFailure('Lỗi tải prompt mặc định', error, {
        actorId: actor.id,
        platform: targetPlatform,
      });
    }

    try {
      return await this.repository.findOldest(actor.id, targetPlatform);
    } catch (error) {
      throw this.persistenceFailure('Lỗi tải prompt dự phòng', error, {
        actorId: actor.id,
        platform: targetPlatform,
      });
    }
  }

  private async loadActive(
    id: string,
    persistenceMessage: string,
    notFoundMessage = 'Không tìm thấy prompt'
  ): Promise<PromptRecord> {
    let prompt: PromptRecord | null;
    try {
      prompt = await this.repository.findActiveById(id);
    } catch (error) {
      throw this.persistenceFailure(persistenceMessage, error, { promptId: id });
    }

    if (!prompt) {
      throw new PromptModuleError('PROMPT_NOT_FOUND', notFoundMessage, undefined, { promptId: id });
    }
    return prompt;
  }

  private assertOwnerOrAdmin(actor: PromptActor, prompt: PromptRecord, message: string) {
    if (prompt.created_by !== actor.id && actor.role !== 'admin') {
      throw new PromptModuleError('PROMPT_ACCESS_DENIED', message, undefined, {
        promptId: prompt.id,
        actorId: actor.id,
      });
    }
  }

  private async notifyCreated(actor: PromptActor, prompt: PromptRecord) {
    if (!this.notify) return;

    try {
      await this.notify({
        userId: actor.id,
        type: 'info',
        title: 'Thêm Prompt thành công',
        message: `Prompt "${prompt.name}" đã được tạo thành công cho nền tảng ${prompt.platform}.`,
        metadata: { prompt_id: prompt.id },
      });
    } catch (error) {
      console.error('[POST /api/prompts] Lỗi khi tạo thông báo thêm prompt:', getErrorMessage(error));
    }
  }

  private persistenceFailure(
    clientMessage: string,
    cause: unknown,
    context?: Record<string, unknown>
  ) {
    return new PromptModuleError('PROMPT_PERSISTENCE_FAILED', clientMessage, cause, context);
  }
}

