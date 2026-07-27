export type GlobalSearchRole = 'admin' | 'marketer_full' | 'marketer_content';
export type GlobalSearchLanguage = 'vi' | 'en';

export interface GlobalSearchActor {
  id: string;
  role: GlobalSearchRole;
}

export interface RawGlobalSearchInput {
  query?: string | null;
  language?: string | null;
  actor: GlobalSearchActor;
}

export interface GlobalSearchInput {
  query: string;
  language: GlobalSearchLanguage;
  actor: GlobalSearchActor;
}

export interface FaqSearchResult {
  key: string;
  category: string;
  question: string;
  answer: string;
}

export interface AdminSearchRecords {
  users: unknown[];
  auditLogs: unknown[];
}

export interface MarketerSearchRecords {
  articles: unknown[];
  captions: unknown[];
  prompts: unknown[];
}

export interface AdminSearchResult extends AdminSearchRecords {
  faqs: FaqSearchResult[];
}

export interface MarketerSearchResult extends MarketerSearchRecords {
  faqs: FaqSearchResult[];
}

export type GlobalSearchResult = AdminSearchResult | MarketerSearchResult;

export interface GlobalSearchRepository {
  searchAdmin(query: string): Promise<AdminSearchRecords>;
  searchMarketer(query: string, actorId: string): Promise<MarketerSearchRecords>;
}

export interface GlobalSearchFaqProvider {
  search(query: string, language: GlobalSearchLanguage): FaqSearchResult[];
}
