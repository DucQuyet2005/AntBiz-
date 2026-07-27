import { describe, expect, it } from 'vitest';
import { LandingConfigurationModule } from '@/backend/modules/landing-configuration/landing-configuration-module';
import { LandingConfigurationRepositoryError } from '@/backend/modules/landing-configuration/errors';
import {
  landingConfigurationSnapshotsEqual,
  normalizeLandingConfigurationSnapshot,
  projectLandingConfiguration,
} from '@/backend/modules/landing-configuration/landing-configuration-projection';
import type {
  JsonValue,
  LandingConfigurationEntry,
  LandingConfigurationHistoryRecord,
  LandingConfigurationRepository,
  LandingConfigurationSnapshot,
} from '@/backend/modules/landing-configuration/landing-configuration-types';

const ACTOR_ID = '11111111-1111-4111-8111-111111111111';
const HISTORY_ID = '22222222-2222-4222-8222-222222222222';

function entry(
  section: string,
  key: string,
  value: JsonValue
): LandingConfigurationEntry {
  return {
    id: `${section}-${key}`,
    section,
    key,
    value,
    updated_by: ACTOR_ID,
    updated_at: '2026-07-15T00:00:00.000Z',
  };
}

function history(
  snapshot: LandingConfigurationSnapshot,
  overrides: Partial<LandingConfigurationHistoryRecord> = {}
): LandingConfigurationHistoryRecord {
  return {
    id: HISTORY_ID,
    config_snapshot: snapshot,
    note: 'Checkpoint',
    created_by: ACTOR_ID,
    created_at: '2026-07-15T00:00:00.000Z',
    ...overrides,
  };
}

class FakeLandingConfigurationRepository implements LandingConfigurationRepository {
  entries: LandingConfigurationEntry[] = [];
  histories: LandingConfigurationHistoryRecord[] = [];
  replacedSnapshot: LandingConfigurationSnapshot | null = null;
  replaceError: Error | null = null;

  async listEntries() {
    return this.entries;
  }

  async upsertEntry(input: {
    section: string;
    key: string;
    value: JsonValue;
    updatedBy: string;
  }) {
    const record = entry(input.section, input.key, input.value);
    record.updated_by = input.updatedBy;
    const index = this.entries.findIndex(
      (item) => item.section === input.section && item.key === input.key
    );
    if (index >= 0) this.entries[index] = record;
    else this.entries.push(record);
    return record;
  }

  async clearEntries() {
    this.entries = [];
  }

  async findLatestHistory() {
    return this.histories[0] ?? null;
  }

  async listHistory(limit: number) {
    return this.histories.slice(0, limit);
  }

  async createHistory(input: {
    snapshot: LandingConfigurationSnapshot;
    note: string;
    createdBy: string;
  }) {
    const record = history(input.snapshot, {
      id: `22222222-2222-4222-8222-${String(this.histories.length + 1).padStart(12, '0')}`,
      note: input.note,
      created_by: input.createdBy,
    });
    this.histories.unshift(record);
    return record;
  }

  async findHistoryById(id: string) {
    return this.histories.find((item) => item.id === id) ?? null;
  }

  async updateHistoryNote(id: string, note: string) {
    const record = this.histories.find((item) => item.id === id);
    if (!record) return false;
    record.note = note;
    return true;
  }

  async deleteHistory(id: string) {
    const originalLength = this.histories.length;
    this.histories = this.histories.filter((item) => item.id !== id);
    return this.histories.length !== originalLength;
  }

  async replaceEntries(snapshot: LandingConfigurationSnapshot) {
    if (this.replaceError) throw this.replaceError;
    this.replacedSnapshot = snapshot;
  }
}

describe('Landing Configuration projection', () => {
  it('creates a deterministic Section/Key projection without changing array order', () => {
    const projection = projectLandingConfiguration([
      entry('hero', 'slides', [{ title: 'Second' }, { title: 'First' }]),
      entry('footer', 'visible', true),
      entry('hero', 'title', 'AntBiz'),
    ]);

    expect(Object.keys(projection)).toEqual(['footer', 'hero']);
    expect(Object.keys(projection.hero)).toEqual(['slides', 'title']);
    expect(projection.hero.slides).toEqual([{ title: 'Second' }, { title: 'First' }]);
  });

  it('compares nested objects independent of key order and preserves array semantics', () => {
    expect(landingConfigurationSnapshotsEqual(
      { hero: { content: { title: 'A', flags: [true, false] } } },
      { hero: { content: { flags: [true, false], title: 'A' } } }
    )).toBe(true);
    expect(landingConfigurationSnapshotsEqual(
      { hero: { flags: [true, false] } },
      { hero: { flags: [false, true] } }
    )).toBe(false);
  });

  it('rejects duplicate logical keys and malformed snapshots', () => {
    expect(() => projectLandingConfiguration([
      entry('hero', 'title', 'A'),
      entry('hero', 'title', 'B'),
    ])).toThrow('trùng section và key');
    expect(() => normalizeLandingConfigurationSnapshot({ hero: 'invalid' })).toThrow(
      'Bản lưu cấu hình không hợp lệ'
    );
  });

  it('projects special object keys as data without mutating object prototypes', () => {
    const projection = projectLandingConfiguration([
      entry('__proto__', 'constructor', 'safe'),
    ]);

    expect(Object.getPrototypeOf(projection)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(projection, '__proto__')).toBe(true);
    expect(projection.__proto__.constructor).toBe('safe');
  });
});

describe('LandingConfigurationModule', () => {
  it('trims identity fields and preserves JSON null while setting live config', async () => {
    const repository = new FakeLandingConfigurationRepository();
    const landingConfiguration = new LandingConfigurationModule(repository);

    await expect(landingConfiguration.set(ACTOR_ID, {
      section: ' hero ',
      key: ' subtitle ',
      value: null,
    })).resolves.toMatchObject({ section: 'hero', key: 'subtitle', value: null });
  });

  it('rejects missing values and oversized history notes', async () => {
    const landingConfiguration = new LandingConfigurationModule(
      new FakeLandingConfigurationRepository()
    );

    await expect(landingConfiguration.set(ACTOR_ID, {
      section: 'hero',
      key: 'title',
    })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    await expect(
      landingConfiguration.publish(ACTOR_ID, { note: 'x'.repeat(501) })
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
  });

  it('creates a checkpoint when current configuration changed', async () => {
    const repository = new FakeLandingConfigurationRepository();
    repository.entries = [entry('hero', 'title', 'New')];
    repository.histories = [history({ hero: { title: 'Old' } })];

    const result = await new LandingConfigurationModule(repository).publish(ACTOR_ID, {
      note: 'Release',
    });

    expect(result).toMatchObject({ checkpointCreated: true, note: 'Release' });
    expect(result.history?.config_snapshot).toEqual({ hero: { title: 'New' } });
    expect(repository.histories).toHaveLength(2);
  });

  it('reuses the latest checkpoint when the canonical snapshot is unchanged', async () => {
    const repository = new FakeLandingConfigurationRepository();
    const latest = history({ hero: { content: { subtitle: 'B', title: 'A' } } });
    repository.entries = [entry('hero', 'content', { title: 'A', subtitle: 'B' })];
    repository.histories = [latest];

    await expect(
      new LandingConfigurationModule(repository).publish(ACTOR_ID, {})
    ).resolves.toEqual({ history: latest, checkpointCreated: false, note: 'Published changes' });
    expect(repository.histories).toHaveLength(1);
  });

  it('skips checkpoint creation explicitly while retaining publication outcome', async () => {
    const repository = new FakeLandingConfigurationRepository();
    repository.entries = [entry('hero', 'title', 'Live')];

    await expect(
      new LandingConfigurationModule(repository).publish(ACTOR_ID, { skipHistory: true })
    ).resolves.toEqual({ history: null, checkpointCreated: false, note: 'Published changes' });
    expect(repository.histories).toEqual([]);
  });

  it('rolls back only through the repository replacement boundary', async () => {
    const repository = new FakeLandingConfigurationRepository();
    repository.histories = [history({ hero: { title: 'Restored' } })];

    await expect(
      new LandingConfigurationModule(repository).rollback(HISTORY_ID)
    ).resolves.toEqual({ success: true });
    expect(repository.replacedSnapshot).toEqual({ hero: { title: 'Restored' } });
  });

  it('maps missing checkpoints and replacement failures to stable errors', async () => {
    const repository = new FakeLandingConfigurationRepository();
    const landingConfiguration = new LandingConfigurationModule(repository);

    await expect(landingConfiguration.rollback(HISTORY_ID)).rejects.toMatchObject({
      code: 'CONFIGURATION_NOT_FOUND',
    });

    repository.histories = [history({})];
    repository.replaceError = new Error('rpc failed');
    await expect(landingConfiguration.rollback(HISTORY_ID)).rejects.toMatchObject({
      code: 'ROLLBACK_FAILED',
    });
  });

  it('maps database permission rejection during rollback to forbidden', async () => {
    const repository = new FakeLandingConfigurationRepository();
    repository.histories = [history({})];
    repository.replaceError = new LandingConfigurationRepositoryError(
      'replaceEntries',
      { code: '42501' }
    );

    await expect(
      new LandingConfigurationModule(repository).rollback(HISTORY_ID)
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('updates and deletes history with not-found detection', async () => {
    const repository = new FakeLandingConfigurationRepository();
    repository.histories = [history({})];
    const landingConfiguration = new LandingConfigurationModule(repository);

    await expect(landingConfiguration.updateHistoryNote({ id: HISTORY_ID, note: 'Reviewed' }))
      .resolves.toEqual({ success: true });
    expect(repository.histories[0].note).toBe('Reviewed');
    await expect(landingConfiguration.deleteHistory(HISTORY_ID)).resolves.toEqual({ success: true });
    await expect(landingConfiguration.deleteHistory(HISTORY_ID)).rejects.toMatchObject({
      code: 'CONFIGURATION_NOT_FOUND',
    });
  });
});
