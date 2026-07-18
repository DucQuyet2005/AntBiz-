import type {
  CreateCaptionInput,
  CreateCaptionVersionInput,
  ListCaptionsInput,
  UpdateCaptionInput,
  RegenerateCaptionInput,
} from './caption-management-schemas';

export type CaptionManagementRole = 'admin' | 'marketer_full' | 'marketer_content';

export interface CaptionManagementActor {
  id: string;
  role: CaptionManagementRole;
}

export interface CaptionRecord {
  id: string;
  article_id: string;
  platform: string;
  ai_content: string;
  edited_content?: string | null;
  created_by?: string;
  status: string;
  [key: string]: unknown;
}

export interface CaptionMutationRecord {
  id: string;
  article_id: string;
  platform: string;
  created_by: string;
  ai_content: string;
  edited_content: string | null;
  status: string;
  articles?: {
    id: string;
    title?: string;
    description?: string;
    full_text?: string;
  } | null;
}

export interface CaptionTextRegenerator {
  generate(input: {
    actorId: string;
    article: NonNullable<CaptionMutationRecord['articles']>;
    platform: string;
    currentContent: string;
    mode: RegenerateCaptionInput['mode'];
    selections?: Array<{ start: number; end: number; text: string }>;
    instruction: string;
    presetMode: 'auto' | 'selected' | 'none';
    platformPresetId?: string;
  }): Promise<string>;
}

export interface CaptionVersionRecord {
  id: string;
  version_number: number;
  [key: string]: unknown;
}

export interface CaptionListQuery {
  platform?: string;
  search?: string;
  from: number;
  to: number;
}

export interface CaptionManagementRepository {
  createCaption(input: Record<string, unknown>): Promise<CaptionRecord>;
  linkDraftVersions(articleId: string, platform: string, captionId: string): Promise<void>;
  listCaptions(query: CaptionListQuery): Promise<{ data: CaptionRecord[]; count: number }>;
  findCaptionById(id: string): Promise<CaptionRecord | null>;
  findCaptionForMutation(id: string): Promise<CaptionMutationRecord | null>;
  updateCaption(id: string, input: Record<string, unknown>): Promise<CaptionRecord>;
  updateCaptionIfCurrent(
    id: string,
    expected: { field: 'ai_content' | 'edited_content'; content: string },
    input: Record<string, unknown>
  ): Promise<CaptionRecord | null>;
  latestVersionForCaption(captionId: string): Promise<number | null>;
  latestVersionForArticlePlatform(articleId: string, platform: string): Promise<number | null>;
  insertVersion(input: Record<string, unknown>): Promise<CaptionVersionRecord>;
}

export interface CaptionManagementModuleInterface {
  create(actor: CaptionManagementActor, input: CreateCaptionInput): Promise<CaptionRecord>;
  list(actor: CaptionManagementActor, input: ListCaptionsInput): Promise<{
    data: CaptionRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  get(actor: CaptionManagementActor, id: string): Promise<CaptionRecord>;
  update(actor: CaptionManagementActor, id: string, input: UpdateCaptionInput): Promise<CaptionRecord>;
  regenerate(actor: CaptionManagementActor, id: string, input: RegenerateCaptionInput): Promise<{
    caption: CaptionRecord;
    mode: RegenerateCaptionInput['mode'];
    generatedText: string;
    replacementRanges?: Array<{ start: number; end: number }>;
  }>;
  createVersion(actor: CaptionManagementActor, input: CreateCaptionVersionInput): Promise<CaptionVersionRecord>;
}
