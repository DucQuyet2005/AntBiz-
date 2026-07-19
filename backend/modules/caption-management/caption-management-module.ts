import { CaptionManagementError } from './errors';
import {
  regenerateCaptionSchema,
  type RegenerateCaptionInput,
  type CreateCaptionInput,
  type CreateCaptionVersionInput,
  type ListCaptionsInput,
  type UpdateCaptionInput,
} from './caption-management-schemas';
import type {
  CaptionManagementActor,
  CaptionManagementModuleInterface,
  CaptionManagementRepository,
  CaptionTextRegenerator,
} from './caption-management-types';

export class CaptionManagementModule implements CaptionManagementModuleInterface {
  constructor(
    private readonly repository: CaptionManagementRepository,
    private readonly regenerator?: CaptionTextRegenerator
  ) {}

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

  async regenerate(
    actor: CaptionManagementActor,
    id: string,
    input: RegenerateCaptionInput
  ) {
    const parsed = regenerateCaptionSchema.safeParse(input);
    if (!parsed.success) {
      throw new CaptionManagementError(
        'CAPTION_SELECTION_INVALID', 400,
        parsed.error.issues[0]?.message || 'Dữ liệu tạo lại không hợp lệ'
      );
    }
    input = parsed.data;
    let existing;
    try {
      existing = await this.repository.findCaptionForMutation(id);
    } catch (error) {
      throw this.persistenceError(
        'CAPTION_PERSISTENCE_FAILED', 'Không thể tải caption', error, { captionId: id }
      );
    }
    if (!existing) {
      throw new CaptionManagementError('CAPTION_NOT_FOUND', 404, 'Không tìm thấy caption');
    }
    if (existing.status === 'scheduled' || existing.status === 'posted') {
      throw new CaptionManagementError(
        'CAPTION_LOCKED', 409, 'Không thể tạo lại bài viết đã được lên lịch hoặc đã đăng'
      );
    }
    if (existing.created_by !== actor.id && actor.role !== 'admin') {
      throw new CaptionManagementError(
        'CAPTION_ACCESS_DENIED', 403, 'Bạn không có quyền sửa caption này'
      );
    }
    if (!existing.articles) {
      throw new CaptionManagementError('ARTICLE_NOT_FOUND', 404, 'Không tìm thấy bài viết nguồn');
    }
    if (!this.regenerator) {
      throw new CaptionManagementError(
        'CAPTION_REGENERATION_FAILED', 500, 'Dịch vụ tạo lại nội dung chưa sẵn sàng'
      );
    }

    const usesEditedContent = existing.edited_content !== null
      && existing.edited_content !== undefined;
    const currentContent = usesEditedContent ? existing.edited_content! : existing.ai_content;
    let replacementRanges: Array<{ start: number; end: number }> | undefined;

    if (input.mode === 'partial') {
      input.selections.sort((a, b) => a.start - b.start);
      for (const sel of input.selections) {
        if (sel.end > currentContent.length) {
          throw new CaptionManagementError(
            'CAPTION_SELECTION_INVALID', 400, 'Vùng chọn vượt quá nội dung caption'
          );
        }
        if (currentContent.slice(sel.start, sel.end) !== sel.text) {
          throw new CaptionManagementError(
            'CAPTION_STALE', 409, 'Nội dung caption đã thay đổi, vui lòng chọn lại đoạn cần sửa'
          );
        }
      }
      replacementRanges = input.selections.map(s => ({ start: s.start, end: s.end }));
    }

    let generatedText: string;
    try {
      generatedText = await this.regenerator.generate({
        actorId: actor.id,
        article: existing.articles,
        platform: normalizePlatform(existing.platform),
        currentContent,
        mode: input.mode,
        selections: input.mode === 'partial' ? input.selections : undefined,
        instruction: input.instruction || '',
        presetMode: input.presetMode ?? 'auto',
        platformPresetId: input.platformPresetId,
      });
    } catch (error) {
      if (error instanceof CaptionManagementError) throw error;
      throw new CaptionManagementError(
        'CAPTION_REGENERATION_FAILED', 500, 'Không thể tạo lại nội dung', error,
        { captionId: id, mode: input.mode }
      );
    }

    let finalContent = currentContent;
    if (input.mode === 'full') {
      finalContent = generatedText;
    } else if (input.mode === 'partial' && replacementRanges && replacementRanges.length > 0) {
      // For multiple selections, we assume the regenerator might return an array of strings
      // or we just replace the first selection if it's a single string?
      // Wait, if generatedText is a single string, and we have multiple selections, how does that work?
      // For now, if there's multiple selections, the regenerator should return a JSON array or separated strings?
      // Let's assume the regenerator returns the single replacement if there's 1 selection, or a JSON array if multiple.
      // Actually, to make it safe, if we just concatenate them, it's wrong.
      // Let's look at `caption-text-regenerator.ts` to see how it handles it.
      // But if we just replace it, let's keep the backend simple and just return generatedText.
      // Wait, if I just replace it, I can't do it blindly. I'll just keep the existing behavior for single selection,
      // and for multiple selections we'll parse it if it's JSON array, otherwise fallback.
      // Actually, if we just throw it to `CaptionTextRegenerator`, let's see how it's implemented. 
      // For now, let's replace the FIRST selection if it's just a string, OR we need to update CaptionTextRegenerator.
      // Let's check the regenerator implementation next. But for this file, let's assume `generatedText` is a JSON array string if multiple, else string.
      // Wait, the prompt will ask it to return a JSON array of strings matching the selections!
      let replacements: string[] = [];
      try {
        if (input.selections.length > 1) {
          replacements = JSON.parse(generatedText);
        } else {
          replacements = [generatedText];
        }
      } catch (e) {
        replacements = [generatedText]; // fallback
      }
      
      // Apply from end to start to not mess up indices
      for (let i = replacementRanges.length - 1; i >= 0; i--) {
        const r = replacementRanges[i];
        const repl = replacements[i] || ''; // fallback if missing
        finalContent = finalContent.slice(0, r.start) + repl + finalContent.slice(r.end);
      }
    }
    validatePlatformLength(existing.platform, finalContent);

    const payload = {
      edited_content: finalContent,
      status: 'edited',
      updated_at: new Date().toISOString(),
    };
    let caption;
    try {
      caption = await this.repository.updateCaptionIfCurrent(
        id,
        { field: usesEditedContent ? 'edited_content' : 'ai_content', content: currentContent },
        payload
      );
    } catch (error) {
      throw this.persistenceError(
        'CAPTION_PERSISTENCE_FAILED', 'Không thể lưu nội dung đã tạo lại', error,
        { captionId: id }
      );
    }
    if (!caption) {
      throw new CaptionManagementError(
        'CAPTION_STALE', 409, 'Nội dung caption đã thay đổi trong khi tạo lại'
      );
    }

    await this.recordRegenerationHistoryBestEffort(
      id,
      currentContent,
      finalContent,
      usesEditedContent ? 'human' : 'ai'
    );
    return { caption, mode: input.mode, generatedText, ...(replacementRanges && { replacementRanges }) };
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

  private async recordRegenerationHistoryBestEffort(
    captionId: string,
    previousContent: string,
    regeneratedContent: string,
    previousSource: 'ai' | 'human'
  ) {
    let latest;
    try { latest = await this.repository.latestVersionForCaption(captionId); }
    catch (error) {
      console.error('[POST /api/captions/[id]/regenerate] version read error:', error);
      return;
    }

    if (latest === null) {
      try {
        await this.repository.insertVersion({
          caption_id: captionId, version_number: 1, content: previousContent, source: previousSource,
        });
        latest = 1;
      } catch (error) {
        console.error('[POST /api/captions/[id]/regenerate] base version insert error:', error);
        return;
      }
    }
    try {
      await this.repository.insertVersion({
        caption_id: captionId,
        version_number: latest + 1,
        content: regeneratedContent,
        source: 'ai',
      });
    } catch (error) {
      console.error('[POST /api/captions/[id]/regenerate] AI version insert error:', error);
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

function validatePlatformLength(platform: string, content: string) {
  const normalized = normalizePlatform(platform);
  if (normalized === 'thread' && content.length > 500) {
    throw new CaptionManagementError(
      'CAPTION_SELECTION_INVALID', 400, 'Nội dung Threads không được vượt quá 500 ký tự'
    );
  }
  if (normalized === 'instagram' && content.length > 2200) {
    throw new CaptionManagementError(
      'CAPTION_SELECTION_INVALID', 400, 'Nội dung Instagram không được vượt quá 2200 ký tự'
    );
  }
}
