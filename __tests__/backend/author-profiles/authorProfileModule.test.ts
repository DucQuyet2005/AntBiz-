import { describe, expect, it } from 'vitest';
import { AuthorProfileModule } from '@/backend/modules/author-profiles/author-profile-module';
import { updateAuthorProfileSchema } from '@/backend/modules/author-profiles/author-profile-schemas';
import type {
  AuthorProfileRecord,
  AuthorProfileRepository,
  StyleSamplePage,
  StyleSampleSource,
} from '@/backend/modules/author-profiles/author-profile-types';

class FakeRepository implements AuthorProfileRepository {
  records: AuthorProfileRecord[] = [];
  updates: Array<{ id: string; input: Record<string, unknown> }> = [];
  error: unknown = null;

  async listByOwner(ownerId: string) {
    this.throwIfNeeded();
    return this.records.filter((record) => record.user_id === ownerId);
  }
  async findById(id: string) {
    this.throwIfNeeded();
    return this.records.find((record) => record.id === id) || null;
  }
  async findNameConflict(ownerId: string, name: string, excludeId?: string) {
    this.throwIfNeeded();
    return this.records.find((record) => (
      record.user_id === ownerId && record.name === name && record.id !== excludeId
    )) || null;
  }
  async insert(input: Record<string, unknown>) {
    this.throwIfNeeded();
    const record = { id: `profile-${this.records.length + 1}`, ...input } as AuthorProfileRecord;
    this.records.push(record);
    return record;
  }
  async update(id: string, input: Record<string, unknown>) {
    this.throwIfNeeded();
    this.updates.push({ id, input });
    const index = this.records.findIndex((record) => record.id === id);
    if (index < 0) throw new Error('not found');
    this.records[index] = { ...this.records[index], ...input };
    return this.records[index];
  }
  async delete(id: string) {
    this.throwIfNeeded();
    this.records = this.records.filter((record) => record.id !== id);
  }
  private throwIfNeeded() { if (this.error) throw this.error; }
}

class FakeSource implements StyleSampleSource {
  safe = new Map<string, boolean>();
  pages = new Map<string, StyleSamplePage>();
  errors = new Map<string, unknown>();
  checked: string[] = [];
  loaded: string[] = [];

  async isSafe(url: string) {
    this.checked.push(url);
    const error = this.errors.get(`safe:${url}`);
    if (error) throw error;
    return this.safe.get(url) ?? true;
  }
  async load(url: string) {
    this.loaded.push(url);
    const error = this.errors.get(url);
    if (error) throw error;
    const page = this.pages.get(url);
    if (!page) throw new Error(`Missing fake page: ${url}`);
    return page;
  }
}

const owner = { userId: 'owner-1', role: 'marketer_full' };
const admin = { userId: 'admin-1', role: 'admin' };

function articlePage(url: string, text: string, html = ''): StyleSamplePage {
  return {
    raw: { url, title: 'Article', contentHtml: html, fullPageHtml: html, crawledAt: 'now' },
    processed: {
      type: 'ARTICLE', url, title: 'Article', category: '', description: '', author: '',
      published_at: '', views: '', tags: [], images: [], body: [], full_text: text,
    },
  };
}

function listingPage(url: string, urls: string[]): StyleSamplePage {
  return {
    raw: { url, title: 'Listing', contentHtml: '', fullPageHtml: '', crawledAt: 'now' },
    processed: {
      type: 'LISTING', url,
      extractedUrls: urls.map((item, index) => ({ url: item, title: `Item ${index}` })),
      warning: 'Listing',
    },
  };
}

function setup() {
  const repository = new FakeRepository();
  const source = new FakeSource();
  const authorProfiles = new AuthorProfileModule(repository, source);
  return { repository, source, module: authorProfiles };
}

describe('AuthorProfileModule', () => {
  it('lists only the actor profiles and creates normalized pending profiles', async () => {
    const { repository, module } = setup();
    repository.records = [
      { id: 'own', user_id: owner.userId, name: 'Own' },
      { id: 'other', user_id: 'other', name: 'Other' },
    ];
    await expect(module.list(owner)).resolves.toEqual([repository.records[0]]);
    await expect(module.create(owner, { name: ' New Style ', source_url: '' }))
      .resolves.toMatchObject({
        user_id: owner.userId, name: 'New Style', source_url: null,
        sample_posts: [], tuning_status: 'pending',
      });
  });

  it('enforces unique names within each owner', async () => {
    const { repository, module } = setup();
    repository.records = [{ id: 'one', user_id: owner.userId, name: 'Duplicate' }];
    await expect(module.create(owner, { name: 'Duplicate' }))
      .rejects.toMatchObject({ code: 'DUPLICATE_NAME', status: 400 });
  });

  it('rejects names that are empty after trimming', () => {
    expect(updateAuthorProfileSchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('allows only the owner or admin to update and delete', async () => {
    const denied = setup();
    denied.repository.records = [{ id: 'profile', user_id: 'other', name: 'Style' }];
    await expect(denied.module.update(owner, 'profile', { name: 'Changed' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    await expect(denied.module.delete(owner, 'profile'))
      .rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    await expect(denied.module.collectStyleSamples(owner, 'profile'))
      .rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    const allowed = setup();
    allowed.repository.records = [{ id: 'profile', user_id: 'other', name: 'Style' }];
    await expect(allowed.module.update(admin, 'profile', { name: 'Changed' }))
      .resolves.toMatchObject({ name: 'Changed' });
    await expect(allowed.module.delete(admin, 'profile')).resolves.toEqual({ deleted: true });
  });

  it('checks admin renames against the profile owner and rejects lifecycle fields', async () => {
    const { repository, module } = setup();
    repository.records = [
      { id: 'profile', user_id: 'other', name: 'Style' },
      { id: 'conflict', user_id: 'other', name: 'Taken' },
    ];
    await expect(module.update(admin, 'profile', { name: 'Taken' }))
      .rejects.toMatchObject({ code: 'DUPLICATE_NAME' });
    expect(updateAuthorProfileSchema.safeParse({ tuning_status: 'ready' }).success).toBe(false);
    expect(updateAuthorProfileSchema.safeParse({ tuned_model_id: 'model' }).success).toBe(false);
  });

  it('requires an owned profile with a safe source before entering training', async () => {
    const missing = setup();
    missing.repository.records = [{ id: 'profile', user_id: owner.userId, name: 'Style' }];
    await expect(missing.module.collectStyleSamples(owner, 'profile'))
      .rejects.toMatchObject({ code: 'MISSING_SOURCE', status: 400 });
    expect(missing.repository.updates).toHaveLength(0);

    const unsafe = setup();
    unsafe.repository.records = [{
      id: 'profile', user_id: owner.userId, name: 'Style', source_url: 'https://unsafe.test',
    }];
    unsafe.source.safe.set('https://unsafe.test', false);
    await expect(unsafe.module.collectStyleSamples(owner, 'profile'))
      .rejects.toMatchObject({ code: 'UNSAFE_URL', status: 400 });
    expect(unsafe.repository.updates).toHaveLength(0);
  });

  it('collects a direct article and safe same-origin related samples', async () => {
    const { repository, source, module } = setup();
    const root = 'https://example.com/article';
    const related = 'https://example.com/related';
    const unsafe = 'https://example.com/unsafe';
    repository.records = [{ id: 'profile', user_id: owner.userId, name: 'Style', source_url: root }];
    source.pages.set(root, articlePage(root, 'Root text', [
      `href="${related}"`, `href="${related}"`, `href="${unsafe}"`,
      'href="https://other.test/article"',
    ].join(' ')));
    source.pages.set(related, articlePage(related, 'Related text'));
    source.safe.set(unsafe, false);

    await expect(module.collectStyleSamples(owner, 'profile')).resolves.toMatchObject({
      sample_posts_count: 2, status: 'ready', tuned_model_id: null,
    });
    expect(source.checked).toEqual([root, related, unsafe]);
    expect(source.loaded).not.toContain(unsafe);
    expect(repository.records[0]).toMatchObject({
      sample_posts: ['Root text', 'Related text'], tuning_status: 'ready', tuned_model_id: null,
    });
  });

  it('collects listing samples, skips child failures, deduplicates, and stops at five', async () => {
    const { repository, source, module } = setup();
    const root = 'https://example.com/listing';
    const urls = Array.from({ length: 6 }, (_, index) => `https://example.com/${index + 1}`);
    repository.records = [{ id: 'profile', user_id: owner.userId, name: 'Style', source_url: root }];
    source.pages.set(root, listingPage(root, urls));
    source.errors.set(urls[0], new Error('child failed'));
    urls.slice(1).forEach((url, index) => source.pages.set(url, articlePage(url, `Text ${index + 1}`)));

    await expect(module.collectStyleSamples(owner, 'profile')).resolves.toMatchObject({
      sample_posts_count: 5, status: 'ready',
    });
    expect(source.loaded).toEqual([root, ...urls]);
  });

  it('marks collection failed when no usable samples remain', async () => {
    const { repository, source, module } = setup();
    const root = 'https://example.com/listing';
    repository.records = [{ id: 'profile', user_id: owner.userId, name: 'Style', source_url: root }];
    source.pages.set(root, listingPage(root, []));

    await expect(module.collectStyleSamples(owner, 'profile'))
      .rejects.toMatchObject({ code: 'NO_SAMPLES', status: 422 });
    expect(repository.records[0].tuning_status).toBe('failed');
  });

  it('marks collection failed when the main crawl fails', async () => {
    const { repository, source, module } = setup();
    const root = 'https://example.com/listing';
    repository.records = [{ id: 'profile', user_id: owner.userId, name: 'Style', source_url: root }];
    source.errors.set(root, new Error('crawl failed'));

    await expect(module.collectStyleSamples(owner, 'profile'))
      .rejects.toMatchObject({ code: 'SOURCE_FAILED', status: 500, clientMessage: 'crawl failed' });
    expect(repository.records[0].tuning_status).toBe('failed');
  });
});
