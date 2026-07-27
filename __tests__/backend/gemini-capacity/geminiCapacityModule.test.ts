import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GeminiCapacityModule } from '@/backend/modules/gemini-capacity/gemini-capacity-module';
import {
  GeminiCapacityError,
  GeminiCapacityRepositoryError,
} from '@/backend/modules/gemini-capacity/errors';
import type {
  EnvironmentCredentialAdapter,
  GeminiCapacityKeyRecord,
  GeminiCapacityKeySummary,
  GeminiCapacityLogger,
  GeminiCapacityRepository,
} from '@/backend/modules/gemini-capacity/gemini-capacity-types';

const KEY_ONE_ID = '11111111-1111-4111-8111-111111111111';
const KEY_TWO_ID = '22222222-2222-4222-8222-222222222222';

function key(id: string, secret: string): GeminiCapacityKeyRecord {
  return {
    id,
    key_value: secret,
    status: 'active',
    rate_limited_until: null,
    error_count: 0,
    last_used_at: null,
  };
}

function summary(id = KEY_ONE_ID): GeminiCapacityKeySummary {
  return {
    id,
    label: 'Primary',
    status: 'active',
    rate_limited_until: null,
    error_count: 0,
    last_used_at: null,
    created_at: '2026-07-16T00:00:00.000Z',
    updated_at: '2026-07-16T00:00:00.000Z',
    masked_value: 'AIzaSy...secret',
  };
}

class FakeGeminiCapacityRepository implements GeminiCapacityRepository {
  keys: GeminiCapacityKeyRecord[] = [];
  summaries: GeminiCapacityKeySummary[] = [];
  claimError: Error | null = null;
  healthError: Error | null = null;
  duplicateCreate = false;
  claims: string[][] = [];
  successes: string[] = [];
  cooldowns: Array<{ id: string; until: string }> = [];
  invalidated: string[] = [];
  transientFailures: string[] = [];

  async claim(excludedIds: string[]) {
    this.claims.push([...excludedIds]);
    if (this.claimError) throw this.claimError;
    return this.keys.find((item) => !excludedIds.includes(item.id)) ?? null;
  }

  async recordSuccess(id: string) {
    if (this.healthError) throw this.healthError;
    this.successes.push(id);
  }

  async recordRateLimit(id: string, until: string) {
    if (this.healthError) throw this.healthError;
    this.cooldowns.push({ id, until });
  }

  async recordInvalid(id: string) {
    if (this.healthError) throw this.healthError;
    this.invalidated.push(id);
  }

  async recordTransientFailure(id: string) {
    if (this.healthError) throw this.healthError;
    this.transientFailures.push(id);
  }

  async listKeys() { return this.summaries; }

  async createKey(secret: string, label: string) {
    void secret;
    void label;
    if (this.duplicateCreate) {
      throw new GeminiCapacityRepositoryError('createKey', { code: '23505' });
    }
    const created = summary();
    this.summaries.push(created);
    return created;
  }

  async updateKey(id: string, input: { label?: string; status?: 'active' | 'invalid' }) {
    const current = this.summaries.find((item) => item.id === id);
    if (!current) return null;
    if (input.label !== undefined) current.label = input.label;
    if (input.status !== undefined) current.status = input.status;
    return current;
  }

  async deleteKey(id: string) {
    const length = this.summaries.length;
    this.summaries = this.summaries.filter((item) => item.id !== id);
    return length !== this.summaries.length;
  }
}

function environment(secret: string | null): EnvironmentCredentialAdapter {
  return { getCredential: () => secret };
}

function logger(): GeminiCapacityLogger {
  return { info: vi.fn(), warn: vi.fn() };
}

describe('GeminiCapacityModule runtime execution', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('GEMINI_LOW_MODEL', 'low-model');
  });

  it('claims a database key, selects one model, and records success', async () => {
    const repository = new FakeGeminiCapacityRepository();
    repository.keys = [key(KEY_ONE_ID, 'secret-one')];
    const runner = vi.fn().mockResolvedValue('result');
    const capacity = new GeminiCapacityModule(repository, environment('env-secret'), undefined, logger());

    await expect(capacity.execute({ title: 'Short', content: 'Body' }, runner))
      .resolves.toBe('result');
    expect(runner).toHaveBeenCalledWith('secret-one', 'low-model');
    expect(repository.successes).toEqual([KEY_ONE_ID]);
  });

  it('puts quota failures on a two-minute cooldown and excludes attempted IDs', async () => {
    const repository = new FakeGeminiCapacityRepository();
    repository.keys = [key(KEY_ONE_ID, 'secret-one'), key(KEY_TWO_ID, 'secret-two')];
    const runner = vi.fn()
      .mockRejectedValueOnce({ status: 429, message: 'quota' })
      .mockResolvedValueOnce('recovered');
    const now = () => new Date('2026-07-16T10:00:00.000Z');
    const capacity = new GeminiCapacityModule(repository, environment(null), now, logger());

    await expect(capacity.execute({ title: '', content: 'short' }, runner))
      .resolves.toBe('recovered');
    expect(repository.cooldowns).toEqual([{
      id: KEY_ONE_ID,
      until: '2026-07-16T10:02:00.000Z',
    }]);
    expect(repository.claims).toEqual([[], [KEY_ONE_ID]]);
  });

  it('invalidates only explicit credential failures', async () => {
    const repository = new FakeGeminiCapacityRepository();
    repository.keys = [key(KEY_ONE_ID, 'secret-one'), key(KEY_TWO_ID, 'secret-two')];
    const runner = vi.fn()
      .mockRejectedValueOnce({ status: 400, message: 'API key not valid' })
      .mockResolvedValueOnce('recovered');
    const capacity = new GeminiCapacityModule(repository, environment(null), undefined, logger());

    await capacity.execute({ title: '', content: 'short' }, runner);

    expect(repository.invalidated).toEqual([KEY_ONE_ID]);
    expect(repository.transientFailures).toEqual([]);
  });

  it('records transient failure without invalidating the key', async () => {
    const repository = new FakeGeminiCapacityRepository();
    repository.keys = [key(KEY_ONE_ID, 'secret-one'), key(KEY_TWO_ID, 'secret-two')];
    const runner = vi.fn()
      .mockRejectedValueOnce({ status: 503, message: 'provider detail' })
      .mockResolvedValueOnce('recovered');
    const capacity = new GeminiCapacityModule(repository, environment(null), undefined, logger());

    await capacity.execute({ title: '', content: 'short' }, runner);

    expect(repository.transientFailures).toEqual([KEY_ONE_ID]);
    expect(repository.invalidated).toEqual([]);
  });

  it('stops on model configuration failure without trying another key or mutating health', async () => {
    const repository = new FakeGeminiCapacityRepository();
    repository.keys = [key(KEY_ONE_ID, 'secret-one'), key(KEY_TWO_ID, 'secret-two')];
    const rawMessage = 'Model private-preview not found with provider body';
    const runner = vi.fn().mockRejectedValue({ status: 404, message: rawMessage });
    const capacity = new GeminiCapacityModule(repository, environment('env-secret'), undefined, logger());

    let caughtError: unknown;
    try {
      await capacity.execute({ title: '', content: 'short' }, runner);
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(GeminiCapacityError);
    const capacityError = caughtError as GeminiCapacityError;
    expect(capacityError).toMatchObject({ code: 'MODEL_CONFIGURATION_ERROR' });
    expect(capacityError.message).not.toContain(rawMessage);
    expect(runner).toHaveBeenCalledTimes(1);
    expect(repository.invalidated).toEqual([]);
    expect(repository.transientFailures).toEqual([]);
  });

  it('falls back to the environment after database claim failure', async () => {
    const repository = new FakeGeminiCapacityRepository();
    repository.claimError = new Error('database unavailable');
    const runner = vi.fn().mockResolvedValue('fallback-result');
    const capacity = new GeminiCapacityModule(repository, environment('env-secret'), undefined, logger());

    await expect(capacity.execute({ title: '', content: 'short' }, runner))
      .resolves.toBe('fallback-result');
    expect(runner).toHaveBeenCalledWith('env-secret', 'low-model');
  });

  it('tries an environment credential at most once and skips a duplicate secret', async () => {
    const repository = new FakeGeminiCapacityRepository();
    repository.keys = [key(KEY_ONE_ID, 'same-secret')];
    const runner = vi.fn().mockRejectedValue({ status: 503, message: 'failed' });
    const capacity = new GeminiCapacityModule(repository, environment('same-secret'), undefined, logger());

    await expect(capacity.execute({ title: '', content: 'short' }, runner)).rejects.toMatchObject({
      code: 'CAPACITY_EXHAUSTED',
    });
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('returns capacity unavailable when no database or environment key can be used', async () => {
    const repository = new FakeGeminiCapacityRepository();
    const capacity = new GeminiCapacityModule(repository, environment(null), undefined, logger());

    await expect(capacity.execute({ title: '', content: 'short' }, vi.fn())).rejects.toMatchObject({
      code: 'CAPACITY_UNAVAILABLE',
    });
  });

  it('keeps a successful result when health persistence fails', async () => {
    const repository = new FakeGeminiCapacityRepository();
    repository.keys = [key(KEY_ONE_ID, 'secret-one')];
    repository.healthError = new Error('write failed');
    const capacityLogger = logger();
    const capacity = new GeminiCapacityModule(repository, environment(null), undefined, capacityLogger);

    await expect(capacity.execute(
      { title: '', content: 'short' },
      vi.fn().mockResolvedValue('result')
    )).resolves.toBe('result');
    expect(capacityLogger.warn).toHaveBeenCalledWith(
      'health_persistence_failed',
      expect.objectContaining({ keyId: KEY_ONE_ID })
    );
  });
});

describe('GeminiCapacityModule administration', () => {
  it('returns only the repository summary projection', async () => {
    const repository = new FakeGeminiCapacityRepository();
    repository.summaries = [summary()];
    const capacity = new GeminiCapacityModule(repository, environment(null), undefined, logger());

    const result = await capacity.listKeys();

    expect(result[0].masked_value).toBe('AIzaSy...secret');
    expect(result[0]).not.toHaveProperty('key_value');
  });

  it('validates write-only creation input and maps duplicates', async () => {
    const repository = new FakeGeminiCapacityRepository();
    const capacity = new GeminiCapacityModule(repository, environment(null), undefined, logger());

    await expect(capacity.createKey({ key_value: '', label: 'Primary' })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    repository.duplicateCreate = true;
    await expect(capacity.createKey({ key_value: 'secret', label: 'Primary' })).rejects.toMatchObject({
      code: 'DUPLICATE_KEY',
    });
  });

  it('rejects runtime-owned health fields in administrator updates', async () => {
    const repository = new FakeGeminiCapacityRepository();
    repository.summaries = [summary()];
    const capacity = new GeminiCapacityModule(repository, environment(null), undefined, logger());

    await expect(capacity.updateKey(KEY_ONE_ID, {
      status: 'rate_limited',
      rate_limited_until: '2026-07-16T10:00:00.000Z',
    })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('distinguishes missing update and delete records', async () => {
    const repository = new FakeGeminiCapacityRepository();
    const capacity = new GeminiCapacityModule(repository, environment(null), undefined, logger());

    await expect(capacity.updateKey(KEY_ONE_ID, { label: 'Changed' })).rejects.toMatchObject({
      code: 'KEY_NOT_FOUND',
    });
    await expect(capacity.deleteKey(KEY_ONE_ID)).rejects.toMatchObject({
      code: 'KEY_NOT_FOUND',
    });
  });
});
