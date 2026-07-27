import { GeminiCapacityRepositoryError } from './errors';
import type {
  GeminiCapacityKeySummary,
  GeminiCapacityRepository,
} from './gemini-capacity-types';

export class UnavailableGeminiCapacityRepository implements GeminiCapacityRepository {
  constructor(private readonly reason: unknown) {}

  claim(): Promise<null> { return this.unavailable('claim'); }
  recordSuccess(): Promise<void> { return this.unavailable('recordSuccess'); }
  recordRateLimit(): Promise<void> { return this.unavailable('recordRateLimit'); }
  recordInvalid(): Promise<void> { return this.unavailable('recordInvalid'); }
  recordTransientFailure(): Promise<void> { return this.unavailable('recordTransientFailure'); }
  listKeys(): Promise<GeminiCapacityKeySummary[]> { return this.unavailable('listKeys'); }
  createKey(): Promise<GeminiCapacityKeySummary> { return this.unavailable('createKey'); }
  updateKey(): Promise<GeminiCapacityKeySummary | null> { return this.unavailable('updateKey'); }
  deleteKey(): Promise<boolean> { return this.unavailable('deleteKey'); }

  private unavailable<T>(operation: string): Promise<T> {
    return Promise.reject(new GeminiCapacityRepositoryError(operation, this.reason));
  }
}
