import { describe, expect, it, vi } from 'vitest';
import { PromptModule } from '@/backend/modules/prompts/prompt-module';
import type { CreatePromptInput, UpdatePromptInput } from '@/backend/modules/prompts/prompt-schemas';
import type {
  PromptListInput,
  PromptListResult,
  PromptRecord,
  PromptRepository,
} from '@/backend/modules/prompts/prompt-types';

const owner = { id: 'owner-1', role: 'marketer_content' as const };
const otherUser = { id: 'other-1', role: 'marketer_content' as const };
const admin = { id: 'admin-1', role: 'admin' as const };

function prompt(overrides: Partial<PromptRecord> = {}): PromptRecord {
  return {
    id: 'prompt-1',
    name: 'Original',
    platform: 'facebook',
    content: 'Write a useful caption',
    tags: ['news'],
    created_by: owner.id,
    is_deleted: false,
    is_default: false,
    usage_count: 0,
    created_at: '2026-07-15T00:00:00.000Z',
    ...overrides,
  };
}

class FakePromptRepository implements PromptRepository {
  prompts: PromptRecord[] = [];
  captionIds: string[] = [];
  scheduledCaptionIds: Array<string | null> = [];

  async list(input: PromptListInput, ownerId?: string): Promise<PromptListResult> {
    const filtered = this.prompts.filter((item) => {
      if (item.is_deleted) return false;
      if (ownerId && item.created_by !== ownerId) return false;
      if (input.platform && item.platform !== input.platform) return false;
      if (input.search && !item.name.toLowerCase().includes(input.search.toLowerCase())) return false;
      return true;
    });
    return { data: filtered, total: filtered.length };
  }

  async clearDefaults(ownerId: string, platform: string): Promise<void> {
    this.prompts.forEach((item) => {
      if (item.created_by === ownerId && item.platform === platform && !item.is_deleted) {
        item.is_default = false;
      }
    });
  }

  async create(input: CreatePromptInput & Record<string, unknown>): Promise<PromptRecord> {
    const created = prompt({ ...input, id: `prompt-${this.prompts.length + 1}` } as Partial<PromptRecord>);
    this.prompts.push(created);
    return created;
  }

  async findActiveById(id: string): Promise<PromptRecord | null> {
    return this.prompts.find((item) => item.id === id && !item.is_deleted) ?? null;
  }

  async updateActive(id: string, input: UpdatePromptInput): Promise<PromptRecord | null> {
    const current = await this.findActiveById(id);
    if (!current) return null;
    Object.assign(current, input);
    return current;
  }

  async softDelete(id: string): Promise<{ id: string } | null> {
    const current = await this.findActiveById(id);
    if (!current) return null;
    current.is_deleted = true;
    return { id };
  }

  async getUsageCount(id: string): Promise<number | null> {
    const current = this.prompts.find((item) => item.id === id);
    return current ? current.usage_count ?? 0 : null;
  }

  async setUsageCount(id: string, count: number): Promise<void> {
    const current = this.prompts.find((item) => item.id === id);
    if (current) current.usage_count = count;
  }

  async findCaptionIdsByPrompt(id: string): Promise<string[]> {
    void id;
    return this.captionIds;
  }

  async findScheduledCaptionIds(statuses: string[]): Promise<Array<string | null>> {
    void statuses;
    return this.scheduledCaptionIds;
  }

  async findDefault(ownerId: string, platform: string): Promise<PromptRecord | null> {
    return this.prompts.find(
      (item) => item.created_by === ownerId && item.platform === platform && item.is_default && !item.is_deleted
    ) ?? null;
  }

  async findOldest(ownerId: string, platform: string): Promise<PromptRecord | null> {
    return this.prompts.find(
      (item) => item.created_by === ownerId && item.platform === platform && !item.is_deleted
    ) ?? null;
  }
}

function createInput(overrides: Partial<CreatePromptInput> = {}): CreatePromptInput {
  return {
    name: 'New Prompt',
    platform: 'facebook',
    content: 'Create a concise caption',
    tags: [],
    is_default: false,
    ...overrides,
  };
}

describe('PromptModule', () => {
  it('limits non-admin lists to the current owner', async () => {
    const repository = new FakePromptRepository();
    repository.prompts = [prompt(), prompt({ id: 'prompt-2', created_by: otherUser.id })];

    const result = await new PromptModule(repository).list(owner, { page: 1, pageSize: 20 });

    expect(result.data.map((item) => item.id)).toEqual(['prompt-1']);
  });

  it('lets admins list prompts from all owners', async () => {
    const repository = new FakePromptRepository();
    repository.prompts = [prompt(), prompt({ id: 'prompt-2', created_by: otherUser.id })];

    const result = await new PromptModule(repository).list(admin, { page: 1, pageSize: 20 });

    expect(result.total).toBe(2);
  });

  it('clears the previous default and sends a best-effort notification', async () => {
    const repository = new FakePromptRepository();
    repository.prompts = [prompt({ is_default: true })];
    const notify = vi.fn().mockRejectedValue(new Error('notification unavailable'));

    const created = await new PromptModule(repository, notify).create(
      owner,
      createInput({ is_default: true })
    );

    expect(repository.prompts[0].is_default).toBe(false);
    expect(created.is_default).toBe(true);
    expect(notify).toHaveBeenCalledOnce();
  });

  it('enforces owner access while allowing admins', async () => {
    const repository = new FakePromptRepository();
    repository.prompts = [prompt()];
    const promptModule = new PromptModule(repository);

    await expect(promptModule.get(otherUser, 'prompt-1')).rejects.toMatchObject({
      code: 'PROMPT_ACCESS_DENIED',
    });
    await expect(promptModule.get(admin, 'prompt-1')).resolves.toMatchObject({ id: 'prompt-1' });
  });

  it('soft-deletes an owned prompt', async () => {
    const repository = new FakePromptRepository();
    repository.prompts = [prompt()];

    await expect(new PromptModule(repository).delete(owner, 'prompt-1')).resolves.toEqual({
      id: 'prompt-1',
      deleted: true,
    });
    expect(repository.prompts[0].is_deleted).toBe(true);
  });

  it('clones with a capped name and makes the actor the owner', async () => {
    const repository = new FakePromptRepository();
    repository.prompts = [prompt({ name: 'x'.repeat(200) })];

    const cloned = await new PromptModule(repository).clone(owner, 'prompt-1');

    expect(cloned.name).toHaveLength(200);
    expect(cloned.name.startsWith('Copy of ')).toBe(true);
    expect(cloned.created_by).toBe(owner.id);
    expect(cloned.cloned_from).toBe('prompt-1');
  });

  it('increments usage count', async () => {
    const repository = new FakePromptRepository();
    repository.prompts = [prompt({ usage_count: 4 })];

    await expect(new PromptModule(repository).recordUse('prompt-1')).resolves.toBe(5);
    expect(repository.prompts[0].usage_count).toBe(5);
  });

  it('counts only active scheduled captions that reference the prompt', async () => {
    const repository = new FakePromptRepository();
    repository.prompts = [prompt()];
    repository.captionIds = ['caption-1', 'caption-2'];
    repository.scheduledCaptionIds = ['caption-1', 'other-caption', 'caption-2', null];

    await expect(new PromptModule(repository).checkUsage(owner, 'prompt-1')).resolves.toEqual({
      in_use: true,
      count: 2,
    });
  });

  it('normalizes threads and falls back to the oldest prompt', async () => {
    const repository = new FakePromptRepository();
    repository.prompts = [prompt({ platform: 'thread', is_default: false })];

    await expect(new PromptModule(repository).getDefault(owner, 'threads')).resolves.toMatchObject({
      id: 'prompt-1',
    });
  });
});
