// Khớp với enum `platform_type` và bảng `public.prompts` trong database.sql
export type PromptPlatform = 'facebook' | 'thread' | 'instagram';

export interface Prompt {
  id: string;
  created_by: string;
  cloned_from: string | null;
  name: string;
  platform: PromptPlatform;
  content: string;
  tags: string[];
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}