import {
  PlatformPresetModuleError,
  platformPresetErrorMessage,
} from './errors';
import { normalizePresetPlatform } from './platform-preset-schemas';
import type {
  CreatePlatformPresetInput,
  UpdatePlatformPresetInput,
} from './platform-preset-schemas';
import type {
  PlatformPresetActor,
  PlatformPresetRecord,
  PlatformPresetRepository,
} from './platform-preset-types';

export class PlatformPresetModule {
  constructor(private readonly repository: PlatformPresetRepository) {}

  async list(actor: PlatformPresetActor, requestedPlatform: string): Promise<PlatformPresetRecord[]> {
    const platform = normalizePresetPlatform(requestedPlatform);
    try {
      if (actor.role === 'admin') {
        const allPresets = await this.repository.listAllPresets(platform);
        return this.sortPresets(allPresets);
      }
      const userPresets = await this.repository.listUserPresets(actor.id, platform);
      const systemPresets = await this.repository.listSystemPresets(platform);
      return this.sortPresets([...userPresets, ...systemPresets]);
    } catch (error) {
      throw this.persistenceFailure('Không thể tải danh sách quy chuẩn', error, {
        actorId: actor.id,
        platform,
      });
    }
  }

  async create(
    actor: PlatformPresetActor,
    input: CreatePlatformPresetInput
  ): Promise<PlatformPresetRecord> {
    const platform = normalizePresetPlatform(input.platform);

    if (input.is_default) {
      await this.resetDefaultsBestEffort(actor.id, platform, 'POST');
    }

    try {
      return await this.repository.upsert({
        user_id: actor.id,
        platform,
        name: input.name,
        rules: input.rules,
        is_default: input.is_default,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      throw this.persistenceFailure('Không thể lưu quy chuẩn', error, {
        actorId: actor.id,
        platform,
      });
    }
  }

  async update(
    actor: PlatformPresetActor,
    id: string,
    input: UpdatePlatformPresetInput
  ): Promise<PlatformPresetRecord> {
    const current = await this.loadForMutation(id);
    this.assertMutableBy(actor, current, 'chỉnh sửa');

    if (input.is_default) {
      await this.resetDefaultsBestEffort(actor.id, current.platform, 'PUT');
    }

    const updateData: UpdatePlatformPresetInput & Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.rules !== undefined) updateData.rules = input.rules;
    if (input.is_default !== undefined) updateData.is_default = input.is_default;

    try {
      return await this.repository.update(id, updateData);
    } catch (error) {
      throw this.persistenceFailure('Không thể cập nhật quy chuẩn', error, { presetId: id });
    }
  }

  async delete(actor: PlatformPresetActor, id: string): Promise<{ success: true }> {
    const current = await this.loadForMutation(id);
    this.assertMutableBy(actor, current, 'xóa');

    try {
      await this.repository.delete(id);
      return { success: true };
    } catch (error) {
      throw this.persistenceFailure('Không thể xóa quy chuẩn', error, { presetId: id });
    }
  }

  private async provisionFromSystem(
    actor: PlatformPresetActor,
    platform: string,
    fallback: PlatformPresetRecord[]
  ) {
    let systemPresets: PlatformPresetRecord[];
    try {
      systemPresets = await this.repository.listSystemPresets(platform);
    } catch (error) {
      console.error('[GET Platform Presets System Error]:', platformPresetErrorMessage(error));
      return fallback;
    }

    if (systemPresets.length === 0) return fallback;

    const updatedAt = new Date().toISOString();
    const presetsToCreate = systemPresets.map((preset) => ({
      platform: preset.platform,
      name: preset.name,
      rules: preset.rules,
      is_default: true,
      user_id: actor.id,
      updated_at: updatedAt,
    }));

    try {
      return await this.repository.cloneForUser(presetsToCreate);
    } catch (error) {
      console.error('[GET Platform Presets Clone Error]:', platformPresetErrorMessage(error));
      return fallback;
    }
  }

  private sortPresets(presets: PlatformPresetRecord[]) {
    return [...presets].sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  private async loadForMutation(id: string): Promise<PlatformPresetRecord> {
    try {
      const preset = await this.repository.findById(id);
      if (preset) return preset;
    } catch (error) {
      throw new PlatformPresetModuleError(
        'PRESET_NOT_FOUND',
        'Không tìm thấy quy chuẩn',
        error,
        { presetId: id }
      );
    }

    throw new PlatformPresetModuleError(
      'PRESET_NOT_FOUND',
      'Không tìm thấy quy chuẩn',
      undefined,
      { presetId: id }
    );
  }

  private assertMutableBy(
    actor: PlatformPresetActor,
    preset: PlatformPresetRecord,
    operation: 'chỉnh sửa' | 'xóa'
  ) {
    if (!preset.user_id) {
      if (actor.role === 'admin') return;
      throw new PlatformPresetModuleError(
        'PRESET_ACCESS_DENIED',
        `Không thể ${operation} quy chuẩn gốc của hệ thống`,
        undefined,
        { presetId: preset.id }
      );
    }

    if (preset.user_id !== actor.id && actor.role !== 'admin') {
      throw new PlatformPresetModuleError(
        'PRESET_ACCESS_DENIED',
        `Bạn không có quyền ${operation} quy chuẩn này`,
        undefined,
        { presetId: preset.id, actorId: actor.id }
      );
    }
  }

  private async resetDefaultsBestEffort(userId: string, platform: string, method: string) {
    try {
      await this.repository.resetDefaults(userId, platform);
    } catch (error) {
      console.error(`[${method} Platform Preset Reset Default Error]:`, platformPresetErrorMessage(error));
    }
  }

  private persistenceFailure(
    clientMessage: string,
    cause: unknown,
    context?: Record<string, unknown>
  ) {
    return new PlatformPresetModuleError(
      'PRESET_PERSISTENCE_FAILED',
      clientMessage,
      cause,
      context
    );
  }
}
