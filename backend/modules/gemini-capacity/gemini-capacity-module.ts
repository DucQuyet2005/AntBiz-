import { GeminiCapacityError, GeminiCapacityRepositoryError } from './errors';
import {
  parseCreateGeminiCapacityKey,
  parseGeminiCapacityKeyId,
  parseUpdateGeminiCapacityKey,
} from './gemini-capacity-schemas';
import { evaluateGeminiComplexity, selectGeminiModel } from './model-selection';
import { classifyGeminiProviderError } from './provider-error-classifier';
import type {
  EnvironmentCredentialAdapter,
  GeminiCapacityLogger,
  GeminiCapacityRepository,
  GeminiProviderFailureKind,
  GeminiWorkload,
} from './gemini-capacity-types';

const RATE_LIMIT_COOLDOWN_MS = 2 * 60 * 1000;

const defaultLogger: GeminiCapacityLogger = {
  info(event, context) {
    console.info('[Gemini Capacity]', { event, ...context });
  },
  warn(event, context) {
    console.warn('[Gemini Capacity]', { event, ...context });
  },
};

export class GeminiCapacityModule {
  constructor(
    private readonly repository: GeminiCapacityRepository,
    private readonly environmentCredential: EnvironmentCredentialAdapter,
    private readonly now: () => Date = () => new Date(),
    private readonly logger: GeminiCapacityLogger = defaultLogger
  ) {}

  async execute<T>(
    workload: GeminiWorkload,
    runner: (apiKey: string, model: string) => Promise<T>
  ): Promise<T> {
    const complexity = evaluateGeminiComplexity(workload);
    const model = selectGeminiModel(complexity);
    const attemptedIds: string[] = [];
    const attemptedSecrets = new Set<string>();
    let databaseAttemptFailed = false;
    let providerAttemptCount = 0;

    this.logger.info('execution_started', { complexity, model });

    while (true) {
      let key;
      try {
        key = await this.repository.claim(attemptedIds);
      } catch {
        databaseAttemptFailed = true;
        this.logger.warn('claim_failed', { model, attempts: providerAttemptCount });
        break;
      }

      if (!key) break;
      if (attemptedIds.includes(key.id)) {
        databaseAttemptFailed = true;
        this.logger.warn('duplicate_claim_rejected', { keyId: key.id });
        break;
      }

      attemptedIds.push(key.id);
      attemptedSecrets.add(key.key_value);
      providerAttemptCount += 1;

      try {
        const result = await runner(key.key_value, model);
        await this.recordHealthBestEffort('record_success', key.id, () =>
          this.repository.recordSuccess(key.id)
        );
        return result;
      } catch (error) {
        const kind = classifyGeminiProviderError(error);
        this.logger.warn('provider_attempt_failed', {
          keyId: key.id,
          model,
          kind,
          attempt: providerAttemptCount,
        });

        if (kind === 'model_configuration') throw this.modelConfigurationError(model);
        await this.recordFailureBestEffort(kind, key.id);
      }
    }

    const fallback = this.environmentCredential.getCredential();
    if (fallback && !attemptedSecrets.has(fallback)) {
      providerAttemptCount += 1;
      try {
        return await runner(fallback, model);
      } catch (error) {
        const kind = classifyGeminiProviderError(error);
        this.logger.warn('environment_attempt_failed', {
          model,
          kind,
          attempt: providerAttemptCount,
        });
        if (kind === 'model_configuration') throw this.modelConfigurationError(model);
        throw this.capacityExhausted(providerAttemptCount);
      }
    }

    if (attemptedIds.length > 0) throw this.capacityExhausted(providerAttemptCount);

    throw new GeminiCapacityError(
      'CAPACITY_UNAVAILABLE',
      'Không có Gemini API Key khả dụng',
      { databaseAttemptFailed }
    );
  }

  async listKeys() {
    return this.persist('list keys', () => this.repository.listKeys());
  }

  async createKey(rawInput: unknown) {
    const input = parseCreateGeminiCapacityKey(rawInput);
    try {
      return await this.repository.createKey(input.key_value, input.label);
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new GeminiCapacityError('DUPLICATE_KEY', 'API Key này đã tồn tại trong hệ thống');
      }
      throw this.persistenceError('create key');
    }
  }

  async updateKey(rawId: unknown, rawInput: unknown) {
    const id = parseGeminiCapacityKeyId(rawId);
    const input = parseUpdateGeminiCapacityKey(rawInput);
    const updated = await this.persist('update key', () => this.repository.updateKey(id, input));
    if (!updated) throw this.notFound(id);
    return updated;
  }

  async deleteKey(rawId: unknown) {
    const id = parseGeminiCapacityKeyId(rawId);
    const deleted = await this.persist('delete key', () => this.repository.deleteKey(id));
    if (!deleted) throw this.notFound(id);
    return { success: true as const };
  }

  private async recordFailureBestEffort(kind: GeminiProviderFailureKind, keyId: string) {
    if (kind === 'quota') {
      const until = new Date(this.now().getTime() + RATE_LIMIT_COOLDOWN_MS).toISOString();
      return this.recordHealthBestEffort('record_rate_limit', keyId, () =>
        this.repository.recordRateLimit(keyId, until)
      );
    }
    if (kind === 'credential') {
      return this.recordHealthBestEffort('record_invalid', keyId, () =>
        this.repository.recordInvalid(keyId)
      );
    }
    return this.recordHealthBestEffort('record_transient_failure', keyId, () =>
      this.repository.recordTransientFailure(keyId)
    );
  }

  private async recordHealthBestEffort(
    operation: string,
    keyId: string,
    task: () => Promise<void>
  ) {
    try {
      await task();
    } catch {
      this.logger.warn('health_persistence_failed', { operation, keyId });
    }
  }

  private async persist<T>(operation: string, task: () => Promise<T>): Promise<T> {
    try {
      return await task();
    } catch {
      throw this.persistenceError(operation);
    }
  }

  private persistenceError(operation: string) {
    return new GeminiCapacityError(
      'PERSISTENCE_FAILED',
      'Không thể quản lý Gemini API Key',
      { operation }
    );
  }

  private notFound(keyId: string) {
    return new GeminiCapacityError(
      'KEY_NOT_FOUND',
      'Không tìm thấy Gemini API Key',
      { keyId }
    );
  }

  private modelConfigurationError(model: string) {
    return new GeminiCapacityError(
      'MODEL_CONFIGURATION_ERROR',
      'Model Gemini được cấu hình không khả dụng',
      { model }
    );
  }

  private capacityExhausted(attempts: number) {
    return new GeminiCapacityError(
      'CAPACITY_EXHAUSTED',
      'Tất cả Gemini API Key khả dụng đều thất bại',
      { attempts }
    );
  }
}

function isDuplicateKey(error: unknown) {
  const cause = error instanceof GeminiCapacityRepositoryError ? error.cause : error;
  return Boolean(
    cause
    && typeof cause === 'object'
    && 'code' in cause
    && cause.code === '23505'
  );
}
