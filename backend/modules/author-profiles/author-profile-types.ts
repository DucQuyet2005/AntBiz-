import type { ArticleData, ListingData } from '@/lib/crawler/preprocess';
import type { CrawlResult } from '@/lib/crawler';
import type {
  CreateAuthorProfileInput,
  UpdateAuthorProfileInput,
} from './author-profile-schemas';

export interface AuthorProfileActor {
  userId: string;
  role: string;
}

export interface AuthorProfileRecord {
  id: string;
  user_id: string;
  name: string;
  source_url?: string | null;
  sample_posts?: string[];
  tuning_status?: string;
  tuned_model_id?: string | null;
  [key: string]: unknown;
}

export interface AuthorProfileRepository {
  listByOwner(ownerId: string): Promise<AuthorProfileRecord[]>;
  findById(id: string): Promise<AuthorProfileRecord | null>;
  findNameConflict(ownerId: string, name: string, excludeId?: string): Promise<AuthorProfileRecord | null>;
  insert(input: Record<string, unknown>): Promise<AuthorProfileRecord>;
  update(id: string, input: Record<string, unknown>): Promise<AuthorProfileRecord>;
  delete(id: string): Promise<void>;
}

export interface StyleSamplePage {
  raw: CrawlResult;
  processed: ArticleData | ListingData;
}

export interface StyleSampleSource {
  isSafe(url: string): Promise<boolean>;
  load(url: string): Promise<StyleSamplePage>;
}

export interface AuthorProfileModuleInterface {
  list(actor: AuthorProfileActor): Promise<AuthorProfileRecord[]>;
  create(actor: AuthorProfileActor, input: CreateAuthorProfileInput): Promise<AuthorProfileRecord>;
  update(actor: AuthorProfileActor, id: string, input: UpdateAuthorProfileInput): Promise<AuthorProfileRecord>;
  delete(actor: AuthorProfileActor, id: string): Promise<{ deleted: true }>;
  collectStyleSamples(actor: AuthorProfileActor, id: string): Promise<Record<string, unknown>>;
}
