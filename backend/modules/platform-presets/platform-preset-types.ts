import type {
  CreatePlatformPresetInput,
  UpdatePlatformPresetInput,
} from './platform-preset-schemas';

export type PlatformPresetRole = 'admin' | 'marketer_full' | 'marketer_content';

export interface PlatformPresetActor {
  id: string;
  role: PlatformPresetRole;
}
export interface PlatformPresetRecord {
  id: string;
  user_id: string | null;
  platform: string;
  name: string;
  rules: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface PlatformPresetRepository {
  listUserPresets(userId: string, platform: string): Promise<PlatformPresetRecord[]>;
  listSystemPresets(platform: string): Promise<PlatformPresetRecord[]>;
  cloneForUser(
    presets: Array<Omit<PlatformPresetRecord, 'id' | 'created_at'>>
  ): Promise<PlatformPresetRecord[]>;
  resetDefaults(userId: string, platform: string): Promise<void>;
  upsert(
    input: CreatePlatformPresetInput & Record<string, unknown>
  ): Promise<PlatformPresetRecord>;
  findById(id: string): Promise<PlatformPresetRecord | null>;
  update(
    id: string,
    input: UpdatePlatformPresetInput & Record<string, unknown>
  ): Promise<PlatformPresetRecord>;
  delete(id: string): Promise<void>;
}
