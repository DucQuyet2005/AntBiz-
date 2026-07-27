import type { CreatePromptInput, UpdatePromptInput } from './prompt-schemas';

export type PromptRole = 'admin' | 'marketer_full' | 'marketer_content';

export interface PromptActor {
  id: string;
  role: PromptRole;
}

export interface PromptRecord {
  id: string;
  name: string;
  platform: string;
  content: string;
  tags: string[];
  created_by: string;
  is_deleted?: boolean;
  is_default?: boolean;
  usage_count?: number | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface PromptListInput {
  platform?: string;
  tags?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export interface PromptListResult {
  data: PromptRecord[];
  total: number;
}

export interface PromptNotificationInput {
  userId: string;
  type: 'info';
  title: string;
  message: string;
  metadata: { prompt_id: string };
}

export type PromptNotifier = (input: PromptNotificationInput) => Promise<unknown>;

export interface PromptRepository {
  list(input: PromptListInput, ownerId?: string): Promise<PromptListResult>;
  clearDefaults(ownerId: string, platform: string): Promise<void>;
  create(input: CreatePromptInput & Record<string, unknown>): Promise<PromptRecord>;
  findActiveById(id: string): Promise<PromptRecord | null>;
  updateActive(id: string, input: UpdatePromptInput): Promise<PromptRecord | null>;
  softDelete(id: string): Promise<{ id: string } | null>;
  getUsageCount(id: string): Promise<number | null>;
  setUsageCount(id: string, count: number): Promise<void>;
  findCaptionIdsByPrompt(id: string): Promise<string[]>;
  findScheduledCaptionIds(statuses: string[]): Promise<Array<string | null>>;
  findDefault(ownerId: string, platform: string): Promise<PromptRecord | null>;
  findOldest(ownerId: string, platform: string): Promise<PromptRecord | null>;
}

