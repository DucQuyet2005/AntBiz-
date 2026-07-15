import { CaptionManagementError } from './errors';
import type {
  CreateCaptionInput,
  CreateCaptionVersionInput,
  ListCaptionsInput,
  UpdateCaptionInput,
} from './caption-management-schemas';
import type {
  CaptionManagementActor,
  CaptionManagementModuleInterface,
  CaptionManagementRepository,
} from './caption-management-types';

export class CaptionManagementModule implements CaptionManagementModuleInterface {
  constructor(private readonly repository: CaptionManagementRepository) {}

  async create(actor: CaptionManagementActor, input: CreateCaptionInput) {
    let caption;
    try {
      caption = await this.repository.createCaption({
        article_id: input.article_id,
        platform: input.platform,
        ai_content: input.ai_content,
        edited_content: input.edited_content || null,
        created_by: actor.id,
        ...(input.prompt_id && { prompt_id: input.prompt_id }),
        ...(input.utm_config_id && { utm_config_id: input.utm_config_id }),
        status: input.edited_content ? 'edited' : 'draft',
      });
    } catch (error) {
      throw this.persistenceError('CAPTION_PERSISTENCE_FAILED', 'Không thể tạo caption', error);
    }

    try {
      await this.repository.linkDraftVersions(input.article_id, input.platform, caption.id);
    } catch (error) {
      console.warn('[POST /api/captions] update versions reference error:', error);
    }
    return caption;
  }

  async list(_actor: CaptionManagementActor, input: ListCaptionsInput) {
    const platform = input.platform !== 'all' && input.platform !== 'All Platforms'
      ? normalizePlatform(input.platform.toLowerCase())
      : undefined;
    const from = (input.page - 1) * input.limit;
    try {
      const result = await this.repository.listCaptions({
        platform,
        search: input.search || undefined,
        from,
        to: from + input.limit - 1,
      });
      return {
        data: result.data,
        total: result.count,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(result.count / input.limit),
      };
    } catch (error) {
      throw this.persistenceError(
        'CAPTION_PERSISTENCE_FAILED',
        'Không thể tải danh sách caption',
        error
      );
    }
  }

  async get(_actor: CaptionManagementActor, id: string) {
    let caption;
    try {
      caption = await this.repository.findCaptionById(id);
    } catch (error) {
      throw this.persistenceError('CAPTION_PERSISTENCE_FAILED', 'Không thể tải caption', error, { captionId: id });
    }
    if (!caption) {
      throw new CaptionManagementError('CAPTION_NOT_FOUND', 404, 'Không tìm thấy caption');
    }
    return caption;
  }

  async update(actor: CaptionManagementActor, id: string, input: UpdateCaptionInput) {
    let existing;
    try {
      existing = await this.repository.findCaptionForMutation(id);
    } catch (error) {
      throw new CaptionManagementError('CAPTION_NOT_FOUND', 404, 'Không tìm thấy caption', error);
    }
    if (!existing) {
      throw new CaptionManagementError('CAPTION_NOT_FOUND', 404, 'Không tìm thấy caption');
    }
    if (existing.status === 'scheduled' || existing.status === 'posted') {
      throw new CaptionManagementError(
        'CAPTION_LOCKED',
        400,
        'Không thể chỉnh sửa bài viết đã được lên lịch hoặc đã đăng'
      );
    }
    if (existing.created_by !== actor.id && actor.role !== 'admin') {
      throw new CaptionManagementError(
        'CAPTION_ACCESS_DENIED',
        403,
        'Bạn không có quyền sửa caption này'
      );
    }

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.is_favorite_template !== undefined) {
      payload.is_favorite_template = input.is_favorite_template;
    }
    if (input.save_as_original) {
      payload.ai_content = input.ai_content
        || input.edited_content
        || existing.edited_content
        || existing.ai_content;
      payload.edited_content = null;
      payload.status = 'draft';
    } else {
      if (input.edited_content !== undefined) payload.edited_content = input.edited_content;
      if (input.status !== undefined) payload.status = input.status;
      else if (input.edited_content !== undefined) payload.status = 'edited';
    }

    let updated;
    try {
      updated = await this.repository.updateCaption(id, payload);
    } catch (error) {
      throw this.persistenceError(
        'CAPTION_PERSISTENCE_FAILED',
        'Không thể cập nhật caption',
        error,
        { captionId: id }
      );
    }

    if (!input.save_as_original
      && input.edited_content !== undefined
      && input.edited_content !== existing.edited_content) {
      await this.recordEditHistoryBestEffort(id, existing.ai_content, input.edited_content);
    }
    return updated;
  }

  async createVersion(_actor: CaptionManagementActor, input: CreateCaptionVersionInput) {
    let latest;
    try {
      latest = await this.repository.latestVersionForArticlePlatform(input.article_id, input.platform);
    } catch (error) {
      throw this.persistenceError(
        'VERSION_PERSISTENCE_FAILED',
        'Không thể đọc phiên bản hiện tại',
        error
      );
    }
    try {
      return await this.repository.insertVersion({
        article_id: input.article_id,
        platform: input.platform,
        version_number: (latest ?? 0) + 1,
        content: input.content,
        source: input.source,
        caption_id: input.caption_id || null,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      throw this.persistenceError(
        'VERSION_PERSISTENCE_FAILED',
        'Không thể lưu phiên bản caption',
        error
      );
    }
  }

  private async recordEditHistoryBestEffort(
    captionId: string,
    aiContent: string,
    editedContent: string | null
  ) {
    let latest;
    try {
      latest = await this.repository.latestVersionForCaption(captionId);
    } catch (error) {
      console.error('[PUT /api/captions/[id]] version read error:', error);
      return;
    }

    if (latest === null) {
      try {
        await this.repository.insertVersion({
          caption_id: captionId,
          version_number: 1,
          content: aiContent,
          source: 'ai',
        });
      } catch (error) {
        console.error('[PUT /api/captions/[id]] AI version insert error:', error);
      }
      try {
        await this.repository.insertVersion({
          caption_id: captionId,
          version_number: 2,
          content: editedContent,
          source: 'human',
        });
      } catch (error) {
        console.error('[PUT /api/captions/[id]] human version insert error:', error);
      }
      return;
    }

    try {
      await this.repository.insertVersion({
        caption_id: captionId,
        version_number: latest + 1,
        content: editedContent,
        source: 'human',
      });
    } catch (error) {
      console.error('[PUT /api/captions/[id]] version insert error:', error);
    }
  }

  private persistenceError(
    code: 'CAPTION_PERSISTENCE_FAILED' | 'VERSION_PERSISTENCE_FAILED',
    message: string,
    cause: unknown,
    context?: Record<string, unknown>
  ) {
    return new CaptionManagementError(code, 500, message, cause, context);
  }
}

function normalizePlatform(platform: string) {
  return platform === 'threads' ? 'thread' : platform;
}
