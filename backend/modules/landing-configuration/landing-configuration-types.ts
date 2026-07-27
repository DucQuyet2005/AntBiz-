export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type LandingConfigurationSnapshot = Record<string, Record<string, JsonValue>>;

export interface LandingConfigurationEntry {
  id: string;
  section: string;
  key: string;
  value: JsonValue;
  updated_by: string | null;
  updated_at: string | null;
}

export interface LandingConfigurationHistoryRecord {
  id: string;
  config_snapshot: LandingConfigurationSnapshot;
  note: string | null;
  created_by: string | null;
  created_at: string | null;
  users?: { email: string | null } | null;
}

export interface LandingConfigurationRepository {
  listEntries(): Promise<LandingConfigurationEntry[]>;
  upsertEntry(input: {
    section: string;
    key: string;
    value: JsonValue;
    updatedBy: string;
  }): Promise<LandingConfigurationEntry>;
  clearEntries(): Promise<void>;
  findLatestHistory(): Promise<LandingConfigurationHistoryRecord | null>;
  listHistory(limit: number): Promise<LandingConfigurationHistoryRecord[]>;
  createHistory(input: {
    snapshot: LandingConfigurationSnapshot;
    note: string;
    createdBy: string;
  }): Promise<LandingConfigurationHistoryRecord>;
  findHistoryById(id: string): Promise<LandingConfigurationHistoryRecord | null>;
  updateHistoryNote(id: string, note: string): Promise<boolean>;
  deleteHistory(id: string): Promise<boolean>;
  replaceEntries(snapshot: LandingConfigurationSnapshot): Promise<void>;
}

export interface LandingConfigurationPublishResult {
  history: LandingConfigurationHistoryRecord | null;
  checkpointCreated: boolean;
  note: string;
}
