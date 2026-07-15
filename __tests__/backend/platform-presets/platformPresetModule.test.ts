import { describe, expect, it, vi } from 'vitest';
import { PlatformPresetModule } from '@/backend/modules/platform-presets/platform-preset-module';
import type {
  CreatePlatformPresetInput,
  UpdatePlatformPresetInput,
} from '@/backend/modules/platform-presets/platform-preset-schemas';
import type {
  PlatformPresetRecord,
  PlatformPresetRepository,
} from '@/backend/modules/platform-presets/platform-preset-types';

const owner = { id: 'user-1', role: 'marketer_full' as const };
const otherUser = { id: 'user-2', role: 'marketer_content' as const };

function preset(overrides: Partial<PlatformPresetRecord> = {}): PlatformPresetRecord {
  return {
    id: 'preset-1',
    user_id: owner.id,
    platform: 'facebook',
    name: 'Editorial',
    rules: 'Use a clear editorial voice',
    is_default: false,
    ...overrides,
  };
}

class FakePlatformPresetRepository implements PlatformPresetRepository {
  presets: PlatformPresetRecord[] = [];
  failSystemList = false;
  failClone = false;
  failReset = false;

  async listUserPresets(userId: string, platform: string): Promise<PlatformPresetRecord[]> {
    return this.presets.filter((item) => item.user_id === userId && item.platform === platform);
  }

  async listSystemPresets(platform: string): Promise<PlatformPresetRecord[]> {
    if (this.failSystemList) throw new Error('system list failed');
    return this.presets.filter((item) => item.user_id === null && item.platform === platform);
  }

  async cloneForUser(
    inputs: Array<Omit<PlatformPresetRecord, 'id' | 'created_at'>>
  ): Promise<PlatformPresetRecord[]> {
    if (this.failClone) throw new Error('clone failed');
    const clones = inputs.map((input, index) => preset({
      ...input,
      id: `clone-${index + 1}`,
    }));
    this.presets.push(...clones);
    return clones;
  }

  async resetDefaults(userId: string, platform: string): Promise<void> {
    if (this.failReset) throw new Error('reset failed');
    this.presets.forEach((item) => {
      if (item.user_id === userId && item.platform === platform) item.is_default = false;
    });
  }

  async upsert(
    input: CreatePlatformPresetInput & Record<string, unknown>
  ): Promise<PlatformPresetRecord> {
    const existing = this.presets.find(
      (item) => item.user_id === input.user_id && item.platform === input.platform && item.name === input.name
    );
    if (existing) {
      Object.assign(existing, input);
      return existing;
    }
    const created = preset({ ...input, id: `preset-${this.presets.length + 1}` });
    this.presets.push(created);
    return created;
  }

  async findById(id: string): Promise<PlatformPresetRecord | null> {
    return this.presets.find((item) => item.id === id) ?? null;
  }

  async update(
    id: string,
    input: UpdatePlatformPresetInput & Record<string, unknown>
  ): Promise<PlatformPresetRecord> {
    const current = this.presets.find((item) => item.id === id);
    if (!current) throw new Error('missing');
    Object.assign(current, input);
    return current;
  }

  async delete(id: string): Promise<void> {
    this.presets = this.presets.filter((item) => item.id !== id);
  }
}

function createInput(overrides: Partial<CreatePlatformPresetInput> = {}): CreatePlatformPresetInput {
  return {
    platform: 'facebook',
    name: 'New Preset',
    rules: 'Write clearly',
    is_default: false,
    ...overrides,
  };
}

describe('PlatformPresetModule', () => {
  it('normalizes threads and lists only user presets', async () => {
    const repository = new FakePlatformPresetRepository();
    repository.presets = [
      preset({ platform: 'thread' }),
      preset({ id: 'preset-2', user_id: otherUser.id, platform: 'thread' }),
    ];

    const result = await new PlatformPresetModule(repository).list(owner, 'threads');

    expect(result.map((item) => item.id)).toEqual(['preset-1']);
  });

  it('sorts defaults first and then by name', async () => {
    const repository = new FakePlatformPresetRepository();
    repository.presets = [
      preset({ id: 'b', name: 'Beta' }),
      preset({ id: 'z', name: 'Zulu', is_default: true }),
      preset({ id: 'a', name: 'Alpha' }),
    ];

    const result = await new PlatformPresetModule(repository).list(owner, 'facebook');

    expect(result.map((item) => item.id)).toEqual(['z', 'a', 'b']);
  });

  it('auto-provisions system presets for an empty user list', async () => {
    const repository = new FakePlatformPresetRepository();
    repository.presets = [preset({ id: 'system-1', user_id: null, is_default: true })];

    const result = await new PlatformPresetModule(repository).list(owner, 'facebook');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ user_id: owner.id, is_default: true, name: 'Editorial' });
  });

  it('returns an empty list when system lookup fails', async () => {
    const repository = new FakePlatformPresetRepository();
    repository.failSystemList = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(new PlatformPresetModule(repository).list(owner, 'facebook')).resolves.toEqual([]);
  });

  it('returns an empty list when cloning system presets fails', async () => {
    const repository = new FakePlatformPresetRepository();
    repository.presets = [preset({ id: 'system-1', user_id: null })];
    repository.failClone = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(new PlatformPresetModule(repository).list(owner, 'facebook')).resolves.toEqual([]);
  });

  it('resets defaults within the normalized platform before upsert', async () => {
    const repository = new FakePlatformPresetRepository();
    repository.presets = [preset({ platform: 'thread', is_default: true })];

    const created = await new PlatformPresetModule(repository).create(
      owner,
      createInput({ platform: 'thread', is_default: true })
    );

    expect(repository.presets[0].is_default).toBe(false);
    expect(created).toMatchObject({ platform: 'thread', is_default: true, user_id: owner.id });
  });

  it('keeps create successful when default reset fails', async () => {
    const repository = new FakePlatformPresetRepository();
    repository.failReset = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      new PlatformPresetModule(repository).create(owner, createInput({ is_default: true }))
    ).resolves.toMatchObject({ name: 'New Preset' });
  });

  it('protects system presets from update and delete', async () => {
    const repository = new FakePlatformPresetRepository();
    repository.presets = [preset({ user_id: null })];
    const platformPresetModule = new PlatformPresetModule(repository);

    await expect(platformPresetModule.update(owner, 'preset-1', { name: 'Changed' })).rejects.toMatchObject({
      code: 'PRESET_ACCESS_DENIED',
    });
    await expect(platformPresetModule.delete(owner, 'preset-1')).rejects.toMatchObject({
      code: 'PRESET_ACCESS_DENIED',
    });
  });

  it('denies mutation by a different owner', async () => {
    const repository = new FakePlatformPresetRepository();
    repository.presets = [preset()];
    const platformPresetModule = new PlatformPresetModule(repository);

    await expect(platformPresetModule.update(otherUser, 'preset-1', { rules: 'Changed' })).rejects.toMatchObject({
      code: 'PRESET_ACCESS_DENIED',
    });
    await expect(platformPresetModule.delete(otherUser, 'preset-1')).rejects.toMatchObject({
      code: 'PRESET_ACCESS_DENIED',
    });
  });

  it('updates and hard-deletes an owned preset', async () => {
    const repository = new FakePlatformPresetRepository();
    repository.presets = [preset()];
    const platformPresetModule = new PlatformPresetModule(repository);

    await expect(platformPresetModule.update(owner, 'preset-1', { name: 'Updated' })).resolves.toMatchObject({
      name: 'Updated',
    });
    await expect(platformPresetModule.delete(owner, 'preset-1')).resolves.toEqual({ success: true });
    expect(repository.presets).toEqual([]);
  });
});
