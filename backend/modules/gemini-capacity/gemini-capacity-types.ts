export type GeminiCapacityStatus = 'active' | 'rate_limited' | 'invalid';
export type GeminiComplexity = 'high' | 'medium' | 'low';
export type GeminiProviderFailureKind =
  | 'credential'
  | 'quota'
  | 'model_configuration'
  | 'transient';

export interface GeminiWorkload {
  title: string;
  content: string;
  layout?: string;
}

export interface GeminiCapacityKeyRecord {
  id: string;
  key_value: string;
  status: GeminiCapacityStatus;
  rate_limited_until: string | null;
  error_count: number;
  last_used_at: string | null;
}

export interface GeminiCapacityKeySummary {
  id: string;
  label: string;
  status: GeminiCapacityStatus;
  rate_limited_until: string | null;
  error_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  masked_value: string;
}

export interface GeminiCapacityRepository {
  claim(excludedIds: string[]): Promise<GeminiCapacityKeyRecord | null>;
  recordSuccess(id: string): Promise<void>;
  recordRateLimit(id: string, until: string): Promise<void>;
  recordInvalid(id: string): Promise<void>;
  recordTransientFailure(id: string): Promise<void>;
  listKeys(): Promise<GeminiCapacityKeySummary[]>;
  createKey(secret: string, label: string): Promise<GeminiCapacityKeySummary>;
  updateKey(
    id: string,
    input: { label?: string; status?: 'active' | 'invalid' }
  ): Promise<GeminiCapacityKeySummary | null>;
  deleteKey(id: string): Promise<boolean>;
}

export interface EnvironmentCredentialAdapter {
  getCredential(): string | null;
}

export interface GeminiCapacityLogger {
  info(event: string, context?: Record<string, unknown>): void;
  warn(event: string, context?: Record<string, unknown>): void;
}

export type GeminiCapacityExecutor = <T>(
  workload: GeminiWorkload,
  runner: (apiKey: string, model: string) => Promise<T>
) => Promise<T>;
