export type QuickPublishingPlatform = 'facebook' | 'threads' | 'instagram';

export interface QuickPublishingPreset {
  id: string;
  user_id?: string | null;
  platform?: string;
  name: string;
  rules: string;
  is_default?: boolean;
}

export interface QuickPublishingPlatformConfig {
  presetId: string;
  customText: string;
  quickPicks: string[];
  configId: string;
}

export interface GenerateCaptionCommand {
  url?: string;
  articleId?: string;
  promptId?: string;
  customPrompt: string;
  platform: QuickPublishingPlatform;
  variantGroupId: string;
  variantIndex: number;
  oldCaptionId?: string;
  model?: string;
  stylePresetId: string;
  presetMode: 'auto' | 'selected' | 'none';
  platformPresetId?: string;
}

export type CaptionStreamEvent =
  | { type: 'text'; text: string }
  | { type: 'validation-error'; message: string }
  | { type: 'completed'; captionId?: string; articleId?: string; variantGroupId?: string | null };

export type QuickPublishingEvent =
  | { type: 'generation-started'; platform: QuickPublishingPlatform; variantId: string; variantIndex: number }
  | { type: 'text-fragment'; platform: QuickPublishingPlatform; variantId: string; variantIndex: number; text: string; accumulated: string }
  | { type: 'caption-resolved'; platform: QuickPublishingPlatform; variantId: string; variantIndex: number; captionId: string }
  | { type: 'article-resolved'; articleId: string }
  | { type: 'generation-completed'; platform: QuickPublishingPlatform; variantId: string; variantIndex: number; content: string }
  | { type: 'generation-failed'; platform: QuickPublishingPlatform; variantId: string; variantIndex: number; error: QuickPublishingFailure }
  | { type: 'generation-aborted'; platform: QuickPublishingPlatform; variantId: string; variantIndex: number }
  | { type: 'draft-resolved'; platform: QuickPublishingPlatform; variantId: string; captionId: string; status: string }
  | { type: 'caption-edit-saved'; platform: QuickPublishingPlatform; variantId: string; captionId: string; status: string }
  | { type: 'caption-regenerated'; platform: QuickPublishingPlatform; captionId: string; mode: 'full' | 'partial'; content: string; replacementRanges?: Array<{ start: number; end: number }> }
  | { type: 'platform-scheduled'; platform: QuickPublishingPlatform; captionId: string }
  | { type: 'platform-schedule-failed'; platform: QuickPublishingPlatform; error: QuickPublishingFailure }
  | { type: 'schedule-completed'; successful: QuickPublishingPlatform[]; failed: QuickPublishingPlatform[] }
  | { type: 'platform-published'; platform: QuickPublishingPlatform; captionId: string }
  | { type: 'platform-publish-failed'; platform: QuickPublishingPlatform; error: QuickPublishingFailure }
  | { type: 'publish-completed'; successful: QuickPublishingPlatform[]; failed: QuickPublishingPlatform[] };

export interface QuickPublishingFailure {
  code: QuickPublishingErrorCode;
  context?: Record<string, unknown>;
}

export type QuickPublishingErrorCode =
  | 'SOURCE_INVALID'
  | 'PRESET_LOAD_FAILED'
  | 'GENERATION_FAILED'
  | 'GENERATION_ABORTED'
  | 'CAPTION_SAVE_FAILED'
  | 'CAPTION_REGENERATION_FAILED'
  | 'CAPTION_STALE'
  | 'CAPTION_LOCKED'
  | 'PLATFORM_NOT_CONNECTED'
  | 'SCHEDULE_INVALID'
  | 'SCHEDULE_FAILED'
  | 'PUBLISH_FAILED';

export interface GenerateBatchInput {
  url?: string;
  articleId?: string;
  platforms: QuickPublishingPlatform[];
  variantIds: string[];
  variantIndexes?: number[];
  variantGroupId: string;
  basePrompt: string;
  promptId?: string;
  model?: string;
  platformConfigs: Record<QuickPublishingPlatform, QuickPublishingPlatformConfig>;
  mode?: 'generation' | 'regeneration';
  oldCaptionId?: string;
}

export interface DraftInput {
  variantId: string;
  platform: QuickPublishingPlatform;
  articleId?: string;
  captionId?: string;
  promptId?: string;
  originalContent: string;
  currentContent: string;
  compiledContent: string;
}

export interface SchedulePlatformInput {
  platform: QuickPublishingPlatform;
  scheduledAt: string;
  draft: DraftInput;
  imageUrls?: string[];
}

export interface ScheduleInput {
  platforms: SchedulePlatformInput[];
  connectedPlatforms: QuickPublishingPlatform[];
  imageUrls: string[];
}

interface RegenerateCaptionOptions {
  presetMode: 'auto' | 'selected' | 'none';
  platformPresetId?: string;
}

export type RegenerateCaptionCommand =
  | (RegenerateCaptionOptions & { mode: 'full'; instruction?: string })
  | (RegenerateCaptionOptions & {
      mode: 'partial';
      selections: Array<{ start: number; end: number; text: string }>;
      instruction: string;
    });

export type RegenerateCaptionInput = RegenerateCaptionCommand & {
  captionId: string;
  platform: QuickPublishingPlatform;
};

export interface RegenerateCaptionResult {
  captionId: string;
  content: string;
  status?: string;
  mode: 'full' | 'partial';
  generatedText: string;
  replacementRanges?: Array<{ start: number; end: number }>;
}

export interface PublishPlatformInput {
  platform: QuickPublishingPlatform;
  draft: DraftInput;
  imageUrls?: string[];
}

export interface PublishInput {
  platforms: PublishPlatformInput[];
  connectedPlatforms: QuickPublishingPlatform[];
  imageUrls: string[];
}

export interface QuickPublishingClient {
  listPresets(platform: QuickPublishingPlatform): Promise<QuickPublishingPreset[]>;
  generate(command: GenerateCaptionCommand, signal?: AbortSignal): AsyncIterable<CaptionStreamEvent>;
  updateCaption(id: string, input: { edited_content: string; status: 'draft' }): Promise<{ id: string; status?: string }>;
  createCaption(input: {
    article_id: string;
    platform: 'facebook' | 'thread' | 'instagram';
    ai_content: string;
    edited_content: string | null;
    prompt_id?: string;
  }): Promise<{ id: string; status?: string }>;
  regenerateCaption(
    id: string,
    input: RegenerateCaptionCommand
  ): Promise<RegenerateCaptionResult>;
  schedule(input: { captionId: string; scheduledAt: string; imageUrls: string[] }): Promise<void>;
  publishNow(input: { captionId: string; imageUrls: string[] }): Promise<void>;
}
