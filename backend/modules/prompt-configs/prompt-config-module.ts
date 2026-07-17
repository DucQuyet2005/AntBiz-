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

const SYSTEM_PRESETS: PromptConfigRecord[] = [
  {
    id: 'sys-1-professional',
    user_id: 'system',
    name: 'Chuyên gia Chuyên nghiệp',
    platform: 'all',
    rules: 'Vai trò: Chuyên gia hàng đầu, cố vấn đáng tin cậy.\nTông giọng: Chuyên nghiệp, khách quan, rõ ràng, mang tính giáo dục và định hướng.\nXưng hô: Chúng tôi - Bạn / Quý khách.\nCấu trúc: Trình bày mạch lạc, có luận điểm rõ ràng, sử dụng số liệu và thuật ngữ chuyên ngành một cách chuẩn xác.',
    params: {
      objectives: ['Giáo dục', 'Thương hiệu'],
      questionnaireAnswers: {
        steps: [
          { key: 'persona', question: 'Vai trò', answer: 'Chuyên gia' },
          { key: 'tone', question: 'Tông giọng', answer: 'Chuyên nghiệp' },
          { key: 'pronoun', question: 'Xưng hô', answer: 'Chúng tôi - Bạn' },
        ]
      }
    },
    is_default: false,
    is_system: true,
  },
  {
    id: 'sys-2-friendly',
    user_id: 'system',
    name: 'Người bạn Gần gũi',
    platform: 'all',
    rules: 'Vai trò: Một người bạn đồng hành thân thiết, thấu hiểu và chia sẻ.\nTông giọng: Gần gũi, ấm áp, thân thiện, mang tính tâm tình và vui vẻ (sử dụng emoji tự nhiên).\nXưng hô: Mình - Bạn / Cậu.\nCấu trúc: Viết như một cuộc trò chuyện, sử dụng câu hỏi tu từ, tạo sự đồng cảm và khuyến khích tương tác.',
    params: {
      objectives: ['Tương tác', 'Thương hiệu'],
      questionnaireAnswers: {
        steps: [
          { key: 'persona', question: 'Vai trò', answer: 'Người bạn' },
          { key: 'tone', question: 'Tông giọng', answer: 'Thân thiện' },
          { key: 'pronoun', question: 'Xưng hô', answer: 'Mình - Bạn' },
        ]
      }
    },
    is_default: false,
    is_system: true,
  },
  {
    id: 'sys-3-dynamic',
    user_id: 'system',
    name: 'Năng động & Truyền cảm hứng',
    platform: 'all',
    rules: 'Vai trò: Người truyền lửa, hoạt náo viên đầy năng lượng.\nTông giọng: Hào hứng, mạnh mẽ, truyền cảm hứng, mang tính hành động cao và thúc đẩy.\nXưng hô: Admin - Các bạn / Mọi người.\nCấu trúc: Câu văn ngắn gọn, nhịp điệu nhanh, sử dụng nhiều động từ mạnh, luôn có Call-to-Action (kêu gọi hành động) mạnh mẽ ở cuối.',
    params: {
      objectives: ['Bán hàng', 'Sự kiện'],
      questionnaireAnswers: {
        steps: [
          { key: 'persona', question: 'Vai trò', answer: 'Người truyền cảm hứng' },
          { key: 'tone', question: 'Tông giọng', answer: 'Năng động' },
          { key: 'pronoun', question: 'Xưng hô', answer: 'Admin - Mọi người' },
        ]
      }
    },
    is_default: false,
    is_system: true,
  },
  {
    id: 'sys-4-storyteller',
    user_id: 'system',
    name: 'Kể chuyện Sáng tạo',
    platform: 'all',
    rules: 'Vai trò: Người kể chuyện cuốn hút, nghệ sĩ sáng tạo.\nTông giọng: Bay bổng, giàu cảm xúc, gợi hình gợi cảm, lôi cuốn sự tò mò.\nXưng hô: Linh hoạt theo câu chuyện (Tôi - Bạn hoặc ẩn danh).\nCấu trúc: Bắt đầu bằng một "hook" (điểm nhấn) hấp dẫn, dẫn dắt qua các tình tiết hoặc nỗi đau, và kết thúc bằng một thông điệp sâu sắc hoặc gợi mở.',
    params: {
      objectives: ['Thương hiệu', 'Tương tác'],
      questionnaireAnswers: {
        steps: [
          { key: 'persona', question: 'Vai trò', answer: 'Người kể chuyện' },
          { key: 'tone', question: 'Tông giọng', answer: 'Cảm xúc, bay bổng' },
          { key: 'pronoun', question: 'Xưng hô', answer: 'Linh hoạt' },
        ]
      }
    },
    is_default: false,
    is_system: true,
  }
];

export class PromptConfigModule {
  constructor(private readonly repository: PromptConfigRepository) {}

  async list(actor: PromptConfigActor, platform?: string): Promise<PromptConfigRecord[]> {
    try {
      const userConfigs = await this.repository.list(actor.id, platform || undefined);
      const combined = [...SYSTEM_PRESETS, ...userConfigs];
      
      combined.sort((a, b) => {
        // 1. is_default comes first
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        
        // 2. user presets (is_system is falsy/undefined) come before system presets
        const aIsSys = !!a.is_system;
        const bIsSys = !!b.is_system;
        if (!aIsSys && bIsSys) return -1;
        if (aIsSys && !bIsSys) return 1;
        
        return 0;
      });

      return combined;
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

