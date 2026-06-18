import { Prompt } from './prompt';

// --- Prompt Suggestion Types ---

export interface PromptSuggestion {
  prompt: Prompt;
  relevanceScore: number;
  matchedTags: string[];
}

export interface PromptSuggestResponse {
  articleCategory: string;
  confidence: number;
  suggestions: PromptSuggestion[];
  isFallback: boolean;
}

// --- Caption Types ---

export type CaptionStatus = 'draft' | 'edited' | 'approved' | 'scheduled' | 'posted';
export type CaptionPlatform = 'facebook' | 'thread' | 'instagram';

export interface Caption {
  id: string;
  article_id: string;
  prompt_id: string | null;
  created_by: string;
  utm_config_id: string | null;
  platform: CaptionPlatform;
  ai_content: string;       // bản AI gốc - KHÔNG bao giờ ghi đè
  edited_content: string | null;
  status: CaptionStatus;
  is_favorite_template: boolean;
  content_hash: string | null;
  utm_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCaptionPayload {
  article_id: string;
  platform: CaptionPlatform;
  ai_content: string;
  prompt_id?: string;
}

export interface UpdateCaptionPayload {
  edited_content: string;
  status?: CaptionStatus;
}
