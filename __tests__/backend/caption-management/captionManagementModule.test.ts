import { describe, expect, it } from 'vitest';
import { CaptionManagementModule } from '@/backend/modules/caption-management/caption-management-module';
import type {
  CaptionListQuery,
  CaptionManagementRepository,
  CaptionMutationRecord,
  CaptionRecord,
  CaptionVersionRecord,
  CaptionTextRegenerator,
} from '@/backend/modules/caption-management/caption-management-types';

class FakeRepository implements CaptionManagementRepository {
  caption: CaptionRecord | null = {
    id: 'caption-1', article_id: 'article-1', platform: 'facebook', ai_content: 'AI',
    edited_content: null, created_by: 'user-1', status: 'draft',
  };
  mutation: CaptionMutationRecord | null = {
    id: 'caption-1', article_id: 'article-1', platform: 'facebook', created_by: 'user-1',
    ai_content: 'AI', edited_content: null, status: 'draft',
    articles: { id: 'article-1', title: 'Article', full_text: 'Source content' },
  };
  listResult = { data: [] as CaptionRecord[], count: 0 };
  latestCaptionVersion: number | null = null;
  latestArticleVersion: number | null = null;
  createdPayload: Record<string, unknown> | null = null;
  updatedPayload: Record<string, unknown> | null = null;
  listQuery: CaptionListQuery | null = null;
  linked: unknown[] = [];
  versions: Record<string, unknown>[] = [];
  linkError: unknown = null;
  historyReadError: unknown = null;
  versionInsertError: unknown = null;

  async createCaption(input: Record<string, unknown>) {
    this.createdPayload = input;
    return { ...this.caption, ...input, id: 'caption-1' } as CaptionRecord;
  }
  async linkDraftVersions(articleId: string, platform: string, captionId: string) {
    if (this.linkError) throw this.linkError;
    this.linked.push([articleId, platform, captionId]);
  }
  async listCaptions(query: CaptionListQuery) { this.listQuery = query; return this.listResult; }
  async findCaptionById() { return this.caption; }
  async findCaptionForMutation() { return this.mutation; }
  async updateCaption(_id: string, input: Record<string, unknown>) {
    this.updatedPayload = input;
    return { ...this.caption, ...input } as CaptionRecord;
  }
  async updateCaptionIfCurrent(
    _id: string,
    _expected: { field: 'ai_content' | 'edited_content'; content: string },
    input: Record<string, unknown>
  ) {
    this.updatedPayload = input;
    return { ...this.caption, ...input } as CaptionRecord;
  }
  async latestVersionForCaption() {
    if (this.historyReadError) throw this.historyReadError;
    return this.latestCaptionVersion;
  }
  async latestVersionForArticlePlatform() { return this.latestArticleVersion; }
  async insertVersion(input: Record<string, unknown>) {
    if (this.versionInsertError) throw this.versionInsertError;
    this.versions.push(input);
    return { id: `version-${this.versions.length}`, ...input } as CaptionVersionRecord;
  }
}

class FakeRegenerator implements CaptionTextRegenerator {
  generatedText = 'Regenerated';
  lastInput: Parameters<CaptionTextRegenerator['generate']>[0] | null = null;
  async generate(input: Parameters<CaptionTextRegenerator['generate']>[0]) {
    this.lastInput = input;
    return this.generatedText;
  }
}

const actor = { id: 'user-1', role: 'marketer_content' as const };

describe('CaptionManagementModule', () => {
  it('creates a draft and links unbound versions', async () => {
    const repository = new FakeRepository();
    const manager = new CaptionManagementModule(repository);
    await manager.create(actor, {
      article_id: 'article-1', platform: 'thread', ai_content: 'AI', edited_content: null,
    });
    expect(repository.createdPayload).toMatchObject({
      article_id: 'article-1', platform: 'thread', created_by: 'user-1', status: 'draft',
    });
    expect(repository.linked).toEqual([['article-1', 'thread', 'caption-1']]);
  });

  it('keeps create successful when draft-version linking fails', async () => {
    const repository = new FakeRepository();
    repository.linkError = new Error('link failed');
    await expect(new CaptionManagementModule(repository).create(actor, {
      article_id: 'article-1', platform: 'facebook', ai_content: 'AI',
    })).resolves.toMatchObject({ id: 'caption-1' });
  });

  it('normalizes list filters and computes pagination metadata', async () => {
    const repository = new FakeRepository();
    repository.listResult.count = 21;
    const result = await new CaptionManagementModule(repository).list(actor, {
      platform: 'Threads', search: 'sale', page: 2, limit: 10,
    });
    expect(repository.listQuery).toEqual({ platform: 'thread', search: 'sale', creatorId: 'user-1', from: 10, to: 19 });
    expect(result).toMatchObject({ total: 21, page: 2, limit: 10, totalPages: 3 });
  });

  it('returns not found when a caption is invisible through RLS', async () => {
    const repository = new FakeRepository();
    repository.caption = null;
    await expect(new CaptionManagementModule(repository).get(actor, 'missing'))
      .rejects.toMatchObject({ code: 'CAPTION_NOT_FOUND', status: 404 });
  });

  it('locks scheduled captions before ownership checks', async () => {
    const repository = new FakeRepository();
    repository.mutation = { ...repository.mutation!, status: 'scheduled', created_by: 'other' };
    await expect(new CaptionManagementModule(repository).update(actor, 'caption-1', { status: 'draft' }))
      .rejects.toMatchObject({ code: 'CAPTION_LOCKED', status: 400 });
  });

  it('denies a non-owner but allows an admin', async () => {
    const repository = new FakeRepository();
    repository.mutation = { ...repository.mutation!, created_by: 'other' };
    const manager = new CaptionManagementModule(repository);
    await expect(manager.update(actor, 'caption-1', { status: 'approved' }))
      .rejects.toMatchObject({ code: 'CAPTION_ACCESS_DENIED', status: 403 });
    await expect(manager.update({ id: 'admin-1', role: 'admin' }, 'caption-1', { status: 'approved' }))
      .resolves.toBeDefined();
  });

  it('marks normal human edits as edited', async () => {
    const repository = new FakeRepository();
    await new CaptionManagementModule(repository).update(actor, 'caption-1', { edited_content: 'Human' });
    expect(repository.updatedPayload).toMatchObject({ edited_content: 'Human', status: 'edited' });
  });

  it('restores selected content as original and resets draft state', async () => {
    const repository = new FakeRepository();
    repository.mutation = { ...repository.mutation!, edited_content: 'Existing edit' };
    await new CaptionManagementModule(repository).update(actor, 'caption-1', { save_as_original: true });
    expect(repository.updatedPayload).toMatchObject({
      ai_content: 'Existing edit', edited_content: null, status: 'draft',
    });
    expect(repository.versions).toHaveLength(0);
  });

  it('creates AI version 1 and human version 2 for the first edit', async () => {
    const repository = new FakeRepository();
    await new CaptionManagementModule(repository).update(actor, 'caption-1', { edited_content: 'Human' });
    expect(repository.versions).toEqual([
      { caption_id: 'caption-1', version_number: 1, content: 'AI', source: 'ai' },
      { caption_id: 'caption-1', version_number: 2, content: 'Human', source: 'human' },
    ]);
  });

  it('increments existing edit history', async () => {
    const repository = new FakeRepository();
    repository.latestCaptionVersion = 4;
    await new CaptionManagementModule(repository).update(actor, 'caption-1', { edited_content: 'Human' });
    expect(repository.versions[0]).toMatchObject({ version_number: 5, source: 'human' });
  });

  it('keeps update successful when history read or insert fails', async () => {
    const readRepository = new FakeRepository();
    readRepository.historyReadError = new Error('read failed');
    await expect(new CaptionManagementModule(readRepository).update(actor, 'caption-1', {
      edited_content: 'Human',
    })).resolves.toBeDefined();
    const insertRepository = new FakeRepository();
    insertRepository.versionInsertError = new Error('insert failed');
    await expect(new CaptionManagementModule(insertRepository).update(actor, 'caption-1', {
      edited_content: 'Human',
    })).resolves.toBeDefined();
  });

  it('creates the next explicit version', async () => {
    const repository = new FakeRepository();
    repository.latestArticleVersion = 2;
    const version = await new CaptionManagementModule(repository).createVersion(actor, {
      article_id: 'article-1', platform: 'instagram', content: 'V3', source: 'human', caption_id: null,
    });
    expect(version).toMatchObject({ version_number: 3, content: 'V3', caption_id: null });
  });

  it('regenerates the full caption and records an AI version', async () => {
    const repository = new FakeRepository();
    const regenerator = new FakeRegenerator();
    const result = await new CaptionManagementModule(repository, regenerator).regenerate(
      actor,
      'caption-1',
      { mode: 'full', instruction: 'More concise', presetMode: 'none' }
    );

    expect(regenerator.lastInput).toMatchObject({
      actorId: 'user-1', platform: 'facebook', currentContent: 'AI', mode: 'full',
    });
    expect(repository.updatedPayload).toMatchObject({
      edited_content: 'Regenerated', status: 'edited',
    });
    expect(repository.versions.at(-1)).toMatchObject({ content: 'Regenerated', source: 'ai' });
    expect(result).toMatchObject({ mode: 'full', generatedText: 'Regenerated' });
  });

  it('regenerates only the verified UTF-16 selection', async () => {
    const repository = new FakeRepository();
    repository.mutation = {
      ...repository.mutation!, ai_content: 'Hello 😀 world',
    };
    const regenerator = new FakeRegenerator();
    regenerator.generatedText = 'planet';
    const result = await new CaptionManagementModule(repository, regenerator).regenerate(
      actor,
      'caption-1',
      {
        mode: 'partial',
        selections: [{ start: 9, end: 14, text: 'world' }],
        instruction: 'Use a synonym', presetMode: 'auto',
      }
    );

    expect(repository.updatedPayload).toMatchObject({ edited_content: 'Hello 😀 planet' });
    expect(result).toMatchObject({
      mode: 'partial', generatedText: 'planet', replacementRanges: [{ start: 9, end: 14 }],
    });
  });

  it('rejects stale partial selections before calling AI', async () => {
    const repository = new FakeRepository();
    const regenerator = new FakeRegenerator();
    await expect(new CaptionManagementModule(repository, regenerator).regenerate(
      actor,
      'caption-1',
      {
        mode: 'partial',
        selections: [{ start: 0, end: 2, text: 'stale' }],
        instruction: 'Rewrite', presetMode: 'auto',
      }
    )).rejects.toMatchObject({ code: 'CAPTION_STALE', status: 409 });
    expect(regenerator.lastInput).toBeNull();
  });

  it('applies ownership and lock rules to regeneration', async () => {
    const repository = new FakeRepository();
    const regenerator = new FakeRegenerator();
    repository.mutation = { ...repository.mutation!, created_by: 'other' };
    await expect(new CaptionManagementModule(repository, regenerator).regenerate(
      actor, 'caption-1', { mode: 'full', presetMode: 'auto' }
    )).rejects.toMatchObject({ code: 'CAPTION_ACCESS_DENIED', status: 403 });

    repository.mutation = { ...repository.mutation!, created_by: 'user-1', status: 'scheduled' };
    await expect(new CaptionManagementModule(repository, regenerator).regenerate(
      actor, 'caption-1', { mode: 'full', presetMode: 'auto' }
    )).rejects.toMatchObject({ code: 'CAPTION_LOCKED', status: 409 });
  });
});
