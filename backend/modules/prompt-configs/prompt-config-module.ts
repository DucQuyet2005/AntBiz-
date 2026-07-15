import { PromptConfigModuleError } from './errors';
import type {
  CreatePromptConfigInput,
  UpdatePromptConfigInput,
} from './prompt-config-schemas';
import type {
  PromptConfigActor,
  PromptConfigRecord,
  PromptConfigRepository,
} from './prompt-config-types';

export class PromptConfigModule {
  constructor(private readonly repository: PromptConfigRepository) {}

  async list(actor: PromptConfigActor, platform?: string): Promise<PromptConfigRecord[]> {
    try {
      return await this.repository.list(actor.id, platform || undefined);
    } catch (error) {
      throw this.persistenceFailure('Không thể tải danh sách cấu hình', error, {
        actorId: actor.id,
        platform,
      });
    }
  }

  async create(
    actor: PromptConfigActor,
    input: CreatePromptConfigInput
  ): Promise<PromptConfigRecord> {
    const name = input.name.trim();

    let duplicate: PromptConfigRecord | null;
    try {
      duplicate = await this.repository.findDuplicateName(actor.id, name);
    } catch (error) {
      throw this.persistenceFailure('Lỗi kiểm tra trùng tên cấu hình', error, {
        actorId: actor.id,
        name,
      });
    }

    if (duplicate) {
      throw new PromptConfigModuleError(
        'CONFIG_DUPLICATE_NAME',
        `Tên cấu hình "${input.name}" đã tồn tại. Vui lòng chọn tên khác.`,
        undefined,
        { actorId: actor.id, name }
      );
    }

    if (input.is_default) {
      try {
        await this.repository.resetDefaults(actor.id);
      } catch (error) {
        throw this.persistenceFailure('Lỗi khi reset cấu hình mặc định cũ', error, {
          actorId: actor.id,
        });
      }
    }

    try {
      return await this.repository.create({
        user_id: actor.id,
        name,
        platform: input.platform,
        rules: input.rules || '',
        params: input.params,
        is_default: input.is_default,
      });
    } catch (error) {
      throw this.persistenceFailure('Không thể lưu cấu hình mới', error, { actorId: actor.id });
    }
  }

  async update(
    actor: PromptConfigActor,
    id: string,
    input: UpdatePromptConfigInput
  ): Promise<PromptConfigRecord> {
    const current = await this.loadForMutation(id);
    this.assertOwner(actor, current, 'Bạn không có quyền chỉnh sửa cấu hình này');

    const updateData: UpdatePromptConfigInput & Record<string, unknown> = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name !== current.name) {
        let duplicate: PromptConfigRecord | null;
        try {
          duplicate = await this.repository.findDuplicateName(actor.id, name, id);
        } catch (error) {
          throw this.persistenceFailure('Lỗi kiểm tra trùng tên cấu hình', error, {
            actorId: actor.id,
            configId: id,
            name,
          });
        }

        if (duplicate) {
          throw new PromptConfigModuleError(
            'CONFIG_DUPLICATE_NAME',
            `Tên cấu hình "${name}" đã tồn tại. Vui lòng chọn tên khác.`,
            undefined,
            { actorId: actor.id, configId: id, name }
          );
        }
      }
      updateData.name = name;
    }

    if (input.platform !== undefined) updateData.platform = input.platform;
    if (input.rules !== undefined) updateData.rules = input.rules;
    if (input.params !== undefined) {
      updateData.params = { ...(current.params || {}), ...input.params };
    }
    if (input.is_default !== undefined) updateData.is_default = input.is_default;
    updateData.updated_at = new Date().toISOString();

    if (updateData.is_default === true && !current.is_default) {
      try {
        await this.repository.resetDefaults(actor.id, id);
      } catch (error) {
        throw this.persistenceFailure('Lỗi khi reset cấu hình mặc định cũ', error, {
          actorId: actor.id,
          configId: id,
        });
      }
    }

    try {
      return await this.repository.update(id, updateData);
    } catch (error) {
      throw this.persistenceFailure('Không thể cập nhật cấu hình', error, { configId: id });
    }
  }

  async delete(actor: PromptConfigActor, id: string): Promise<{ deleted: true }> {
    const current = await this.loadForMutation(id);
    this.assertOwner(actor, current, 'Bạn không có quyền xóa cấu hình này');

    try {
      await this.repository.delete(id);
      return { deleted: true };
    } catch (error) {
      throw this.persistenceFailure('Không thể xóa cấu hình', error, { configId: id });
    }
  }

  async getDefault(actor: PromptConfigActor): Promise<PromptConfigRecord | null> {
    try {
      return await this.repository.findDefault(actor.id);
    } catch (error) {
      throw this.persistenceFailure('Lỗi khi tải cấu hình mặc định', error, { actorId: actor.id });
    }
  }

  private async loadForMutation(id: string): Promise<PromptConfigRecord> {
    try {
      const config = await this.repository.findById(id);
      if (config) return config;
    } catch (error) {
      throw new PromptConfigModuleError(
        'CONFIG_NOT_FOUND',
        'Không tìm thấy cấu hình hoặc lỗi hệ thống',
        error,
        { configId: id }
      );
    }

    throw new PromptConfigModuleError(
      'CONFIG_NOT_FOUND',
      'Không tìm thấy cấu hình hoặc lỗi hệ thống',
      undefined,
      { configId: id }
    );
  }

  private assertOwner(actor: PromptConfigActor, config: PromptConfigRecord, message: string) {
    if (config.user_id !== actor.id) {
      throw new PromptConfigModuleError('CONFIG_ACCESS_DENIED', message, undefined, {
        actorId: actor.id,
        configId: config.id,
      });
    }
  }

  private persistenceFailure(
    clientMessage: string,
    cause: unknown,
    context?: Record<string, unknown>
  ) {
    return new PromptConfigModuleError(
      'CONFIG_PERSISTENCE_FAILED',
      clientMessage,
      cause,
      context
    );
  }
}

