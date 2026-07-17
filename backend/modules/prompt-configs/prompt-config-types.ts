import type {
  CreatePromptConfigInput,
  UpdatePromptConfigInput,
} from './prompt-config-schemas';

export type PromptConfigRole = 'admin' | 'marketer_full' | 'marketer_content';

export interface PromptConfigActor {
  id: string;
  role: PromptConfigRole;
}

export interface PromptConfigRecord {
  id: string;
  user_id: string;
  name: string;
  platform: string;
  rules: string;
  params: Record<string, unknown>;
  is_default: boolean;
  is_system?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface PromptConfigRepository {
  list(userId: string, platform?: string): Promise<PromptConfigRecord[]>;
  findById(id: string): Promise<PromptConfigRecord | null>;
  findDuplicateName(userId: string, name: string, excludeId?: string): Promise<PromptConfigRecord | null>;
  resetDefaults(userId: string, excludeId?: string): Promise<void>;
  create(input: CreatePromptConfigInput & Record<string, unknown>): Promise<PromptConfigRecord>;
  update(id: string, input: UpdatePromptConfigInput & Record<string, unknown>): Promise<PromptConfigRecord>;
  delete(id: string): Promise<void>;
  findDefault(userId: string): Promise<PromptConfigRecord | null>;
}

