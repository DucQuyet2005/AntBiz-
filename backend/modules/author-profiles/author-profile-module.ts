import type {
  CreateAuthorProfileInput,
  UpdateAuthorProfileInput,
} from './author-profile-schemas';
import { AuthorProfileError } from './errors';
import type {
  AuthorProfileActor,
  AuthorProfileModuleInterface,
  AuthorProfileRecord,
  AuthorProfileRepository,
  StyleSamplePage,
  StyleSampleSource,
} from './author-profile-types';

const MAX_SAMPLES = 5;

export class AuthorProfileModule implements AuthorProfileModuleInterface {
  constructor(
    private readonly repository: AuthorProfileRepository,
    private readonly source: StyleSampleSource
  ) {}

  list(actor: AuthorProfileActor) {
    return this.repository.listByOwner(actor.userId);
  }

  async create(actor: AuthorProfileActor, input: CreateAuthorProfileInput) {
    const name = input.name.trim();
    if (await this.repository.findNameConflict(actor.userId, name)) {
      throw duplicateNameError(name);
    }
    return this.repository.insert({
      user_id: actor.userId,
      name,
      source_url: input.source_url?.trim() || null,
      sample_posts: [],
      tuning_status: 'pending',
    });
  }

  async update(actor: AuthorProfileActor, id: string, input: UpdateAuthorProfileInput) {
    const profile = await this.requireProfile(id);
    this.requireMutationAccess(actor, profile);
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name !== profile.name && await this.repository.findNameConflict(profile.user_id, name, id)) {
        throw duplicateNameError(name);
      }
      updateData.name = name;
    }
    if (input.source_url !== undefined) updateData.source_url = input.source_url.trim() || null;
    return this.repository.update(id, { ...updateData, updated_at: new Date().toISOString() });
  }

  async delete(actor: AuthorProfileActor, id: string) {
    const profile = await this.requireProfile(id);
    this.requireMutationAccess(actor, profile);
    await this.repository.delete(id);
    return { deleted: true as const };
  }

  async collectStyleSamples(actor: AuthorProfileActor, id: string) {
    const profile = await this.requireProfile(id);
    this.requireMutationAccess(actor, profile);
    if (!profile.source_url) {
      throw new AuthorProfileError(
        'MISSING_SOURCE', 400, 'Hồ sơ chưa được cấu hình URL nguồn đối thủ'
      );
    }

    const sourceUrl = profile.source_url;
    let safe: boolean;
    try { safe = await this.source.isSafe(sourceUrl); }
    catch (error) {
      throw new AuthorProfileError('SOURCE_FAILED', 500, 'Lỗi kiểm tra an toàn URL', error);
    }
    if (!safe) {
      throw new AuthorProfileError(
        'UNSAFE_URL', 400, 'Địa chỉ URL không được phép truy cập (SSRF Protection)'
      );
    }

    await this.repository.update(id, {
      tuning_status: 'training', updated_at: new Date().toISOString(),
    });

    try {
      const mainPage = await this.source.load(sourceUrl);
      const samples: string[] = [];
      addSample(samples, getPageText(mainPage));

      const candidates = getCandidateUrls(mainPage, sourceUrl);
      for (const url of candidates) {
        if (samples.length >= MAX_SAMPLES) break;
        try {
          if (!await this.source.isSafe(url)) continue;
          const page = await this.source.load(url);
          addSample(samples, getPageText(page));
        } catch (error) {
          console.error(`[Author Profile] Style sample crawl failed for ${url}:`, error);
        }
      }

      if (samples.length === 0) {
        throw new AuthorProfileError(
          'NO_SAMPLES', 422, 'Không thu thập được bài viết mẫu hợp lệ từ nguồn đã cấu hình'
        );
      }

      await this.repository.update(id, {
        sample_posts: samples,
        tuned_model_id: null,
        tuning_status: 'ready',
        updated_at: new Date().toISOString(),
      });
      return {
        message: 'Huấn luyện văn phong tác giả hoàn tất thành công',
        sample_posts_count: samples.length,
        tuned_model_id: null,
        status: 'ready',
      };
    } catch (error) {
      await this.markFailedBestEffort(id);
      if (error instanceof AuthorProfileError) throw error;
      throw new AuthorProfileError(
        'SOURCE_FAILED', 500,
        error instanceof Error ? error.message : 'Lỗi trong tiến trình huấn luyện',
        error
      );
    }
  }

  private async requireProfile(id: string) {
    const profile = await this.repository.findById(id);
    if (!profile) {
      throw new AuthorProfileError('NOT_FOUND', 404, 'Không tìm thấy hồ sơ văn phong tác giả');
    }
    return profile;
  }

  private requireMutationAccess(actor: AuthorProfileActor, profile: AuthorProfileRecord) {
    if (profile.user_id !== actor.userId && actor.role !== 'admin') {
      throw new AuthorProfileError(
        'FORBIDDEN', 403, 'Bạn không có quyền thao tác với văn phong này'
      );
    }
  }

  private async markFailedBestEffort(id: string) {
    try {
      await this.repository.update(id, {
        tuning_status: 'failed', updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Author Profile] Failed to persist failed collection status:', error);
    }
  }
}

function duplicateNameError(name: string) {
  return new AuthorProfileError(
    'DUPLICATE_NAME', 400,
    `Tên văn phong "${name}" đã tồn tại. Vui lòng chọn tên khác.`
  );
}

function getPageText(page: StyleSamplePage) {
  return page.processed.type === 'ARTICLE'
    ? page.processed.full_text || page.processed.description || ''
    : '';
}

function addSample(samples: string[], text: string) {
  const normalized = text.trim();
  if (normalized && !samples.includes(normalized) && samples.length < MAX_SAMPLES) {
    samples.push(normalized);
  }
}

function getCandidateUrls(page: StyleSamplePage, sourceUrl: string) {
  const urls = page.processed.type === 'LISTING'
    ? page.processed.extractedUrls.map((item) => item.url)
    : extractRelatedLinks(page.raw.fullPageHtml, sourceUrl);
  const source = new URL(sourceUrl);
  return [...new Set(urls)].filter((candidate) => {
    try {
      const parsed = new URL(candidate, sourceUrl);
      return parsed.origin === source.origin && parsed.href !== source.href;
    } catch { return false; }
  });
}

function extractRelatedLinks(html: string, baseUrl: string) {
  const links: string[] = [];
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(html)) !== null) {
    try {
      const url = new URL(match[1], baseUrl);
      if ((url.protocol === 'http:' || url.protocol === 'https:') && !url.hash) links.push(url.href);
    } catch { /* Ignore invalid links. */ }
  }
  return links;
}
