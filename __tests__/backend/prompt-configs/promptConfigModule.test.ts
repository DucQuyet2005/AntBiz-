import { describe, expect, it } from 'vitest';
import { PromptConfigModule } from '@/backend/modules/prompt-configs/prompt-config-module';
import type {
  CreatePromptConfigInput,
  UpdatePromptConfigInput,
} from '@/backend/modules/prompt-configs/prompt-config-schemas';
import type {
  PromptConfigRecord,
  PromptConfigRepository,
} from '@/backend/modules/prompt-configs/prompt-config-types';

const owner = { id: 'user-1', role: 'marketer_full' as const };
const otherUser = { id: 'user-2', role: 'marketer_content' as const };

function config(overrides: Partial<PromptConfigRecord> = {}): PromptConfigRecord {
  return {
    id: 'config-1',
    user_id: owner.id,
    name: 'Main Config',
    platform: 'facebook',
    rules: 'Keep it concise',
    params: { variant_count: 2, tone: 'friendly' },
    is_default: false,
    ...overrides,
  };
}

class FakePromptConfigRepository implements PromptConfigRepository {
  configs: PromptConfigRecord[] = [];

  async list(userId: string, platform?: string): Promise<PromptConfigRecord[]> {
    return this.configs.filter(
      (item) => item.user_id === userId && (!platform || item.platform === platform)
    );
  }

  async findById(id: string): Promise<PromptConfigRecord | null> {
    return this.configs.find((item) => item.id === id) ?? null;
  }

  async findDuplicateName(
    userId: string,
    name: string,
    excludeId?: string
  ): Promise<PromptConfigRecord | null> {
    return this.configs.find(
      (item) => item.user_id === userId && item.name === name && item.id !== excludeId
    ) ?? null;
  }

  async resetDefaults(userId: string, excludeId?: string): Promise<void> {
    this.configs.forEach((item) => {
      if (item.user_id === userId && item.id !== excludeId) item.is_default = false;
    });
  }

  async create(
    input: CreatePromptConfigInput & Record<string, unknown>
  ): Promise<PromptConfigRecord> {
    const created = config({
      ...input,
      id: `config-${this.configs.length + 1}`,
    } as Partial<PromptConfigRecord>);
    this.configs.push(created);
    return created;
  }

  async update(
    id: string,
    input: UpdatePromptConfigInput & Record<string, unknown>
  ): Promise<PromptConfigRecord> {
    const current = this.configs.find((item) => item.id === id);
    if (!current) throw new Error('missing');
    Object.assign(current, input);
    return current;
  }

  async delete(id: string): Promise<void> {
    this.configs = this.configs.filter((item) => item.id !== id);
  }

  async findDefault(userId: string): Promise<PromptConfigRecord | null> {
    return this.configs.find((item) => item.user_id === userId && item.is_default) ?? null;
  }
}

function createInput(overrides: Partial<CreatePromptConfigInput> = {}): CreatePromptConfigInput {
  return {
    name: 'New Config',
    platform: 'facebook',
    rules: '',
    params: {},
    is_default: false,
    ...overrides,
  };
}

describe('PromptConfigModule', () => {
  it('lists only the actor configs and applies the platform filter', async () => {
    const repository = new FakePromptConfigRepository();
    repository.configs = [
      config(),
      config({ id: 'config-2', platform: 'instagram' }),
      config({ id: 'config-3', user_id: otherUser.id, platform: 'instagram' }),
    ];

    const result = await new PromptConfigModule(repository).list(owner, 'instagram');

    expect(result.map((item) => item.id)).toEqual(['config-2']);
  });

  it('trims names and resets the previous default on create', async () => {
    const repository = new FakePromptConfigRepository();
    repository.configs = [config({ is_default: true })];

    const created = await new PromptConfigModule(repository).create(
      owner,
      createInput({ name: '  Editorial  ', is_default: true })
    );

    expect(repository.configs[0].is_default).toBe(false);
    expect(created.name).toBe('Editorial');
    expect(created.is_default).toBe(true);
  });

  it('rejects duplicate names for the same user', async () => {
    const repository = new FakePromptConfigRepository();
    repository.configs = [config()];

    await expect(
      new PromptConfigModule(repository).create(owner, createInput({ name: 'Main Config' }))
    ).rejects.toMatchObject({ code: 'CONFIG_DUPLICATE_NAME' });
  });

  it('allows an unchanged name when updating the same config', async () => {
    const repository = new FakePromptConfigRepository();
    repository.configs = [config()];

    await expect(
      new PromptConfigModule(repository).update(owner, 'config-1', { name: 'Main Config' })
    ).resolves.toMatchObject({ name: 'Main Config' });
  });

  it('merges params instead of replacing the current object', async () => {
    const repository = new FakePromptConfigRepository();
    repository.configs = [config()];

    const updated = await new PromptConfigModule(repository).update(owner, 'config-1', {
      params: { variant_count: 3 },
    });

    expect(updated.params).toEqual({ variant_count: 3, tone: 'friendly' });
  });

  it('resets other defaults when an update becomes default', async () => {
    const repository = new FakePromptConfigRepository();
    repository.configs = [
      config({ is_default: true }),
      config({ id: 'config-2', name: 'Second Config' }),
    ];

    const updated = await new PromptConfigModule(repository).update(owner, 'config-2', {
      is_default: true,
    });

    expect(repository.configs[0].is_default).toBe(false);
    expect(updated.is_default).toBe(true);
  });

  it('denies update and delete for a different owner, including admins', async () => {
    const repository = new FakePromptConfigRepository();
    repository.configs = [config()];
    const promptConfigModule = new PromptConfigModule(repository);

    await expect(promptConfigModule.update(otherUser, 'config-1', { rules: 'Changed' })).rejects.toMatchObject({
      code: 'CONFIG_ACCESS_DENIED',
    });
    await expect(promptConfigModule.delete(otherUser, 'config-1')).rejects.toMatchObject({
      code: 'CONFIG_ACCESS_DENIED',
    });
  });

  it('hard-deletes an owned config', async () => {
    const repository = new FakePromptConfigRepository();
    repository.configs = [config()];

    await expect(new PromptConfigModule(repository).delete(owner, 'config-1')).resolves.toEqual({
      deleted: true,
    });
    expect(repository.configs).toEqual([]);
  });

  it('returns the actor default or null', async () => {
    const repository = new FakePromptConfigRepository();
    const promptConfigModule = new PromptConfigModule(repository);

    await expect(promptConfigModule.getDefault(owner)).resolves.toBeNull();
    repository.configs = [config({ is_default: true })];
    await expect(promptConfigModule.getDefault(owner)).resolves.toMatchObject({ id: 'config-1' });
  });
});

