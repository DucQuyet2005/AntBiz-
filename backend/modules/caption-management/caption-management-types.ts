import type {
  CreateCaptionInput,
  CreateCaptionVersionInput,
  ListCaptionsInput,
  UpdateCaptionInput,
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
  created_by: string;
  ai_content: string;
  edited_content: string | null;
  status: string;
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
  createVersion(actor: CaptionManagementActor, input: CreateCaptionVersionInput): Promise<CaptionVersionRecord>;
}
