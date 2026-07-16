export type SocialPlatform = 'facebook' | 'threads' | 'instagram';

export type CrawlStatus = 'idle' | 'crawling' | 'done' | 'error';
export type SourceType = 'gocnhinmoi' | 'tuoitre' | 'dantri' | 'manual' | null;

export interface ArticleContext {
  title?: string;
  url?: string;
  summary?: string;
  keywords?: string[];
  entities?: string[];
  content?: string; // For manual input
}

export interface Preset {
  id: string;
  name: string;
  platform: SocialPlatform;
  tags: string[];
  updatedAt: string;
  isSystem?: boolean;
}

export interface PostContent {
  id: string;
  platform: SocialPlatform;
  content: string;
  status: 'draft' | 'edited' | 'approved' | 'scheduled' | 'posted';
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isFormQuestion?: boolean;
  formKey?: string;
  summaryLabel?: string;
}

export type ScheduleMode = 'now' | 'scheduled';

export interface ScheduleTimelineEvent {
  id: string;
  platform: SocialPlatform;
  time: string; // ISO string
}
