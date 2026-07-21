import { PlatformType, PlatformConnection } from '@/lib/services/creator/platform.service';
import { ArticleContext } from '@/lib/services/creator/article.service';
import { Preset } from '@/lib/services/creator/preset.service';
import { ChatMessage, GeneratedPost } from '@/lib/services/creator/post.service';
import { ScheduledPostInfo } from '@/lib/services/creator/schedule.service';

export interface CreatorFlowState {
  currentStep: number;
  
  // Step 1: Platform Selection
  selectedPlatform: PlatformType | null; // active platform
  selectedPlatforms: PlatformType[];     // all selected platforms
  platforms: PlatformConnection[];
  isLoadingPlatforms: boolean;

  // Step 2: Article Ingestion
  sourceType: 'gocnhinmoi' | 'tuoitre' | 'dantri' | 'manual' | null;
  articleUrl: string;
  articleId: string | null;
  manualTitle: string;
  manualContent: string;
  crawlJobId: string | null;
  crawlStatus: 'idle' | 'crawling' | 'done' | 'error';
  articleContext: ArticleContext | null;
  crawledImageUrls: string[]; // Images extracted from crawled article

  // Step 3: Presets
  presets: Preset[];
  selectedPresetId: string | null;
  searchPresetQuery: string;
  isLoadingPresets: boolean;

  // Step 4: AI Editor & Chat
  postContent: string;
  postId: string | null;
  generatedPost: GeneratedPost | null;
  isGeneratingPost: boolean;
  chatMessages: ChatMessage[];
  isChatSending: boolean;
  highlightSelections: Array<{ id: string; text: string; start: number; end: number }>;
  isHighlightEditing: boolean;
  conversationalStep: number; // For step-by-step assistant questionnaire

  // Drafts for each selected platform
  drafts: Record<string, { content: string; postId: string | null; generatedPost: GeneratedPost | null }>;

  // Step 5: Schedule
  scheduleMode: 'now' | 'scheduled';
  scheduledDateTime: string; // ISO or YYYY-MM-DDTHH:mm
  timelinePosts: ScheduledPostInfo[];
  isLoadingTimeline: boolean;
  isScheduling: boolean;
  publishingSucceededPlatforms: PlatformType[];
  publishingFailedPlatforms: PlatformType[];
}

export type CreatorFlowAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_PLATFORM'; payload: PlatformType | null }
  | { type: 'SET_SELECTED_PLATFORMS'; payload: PlatformType[] }
  | { type: 'SET_PLATFORMS'; payload: PlatformConnection[] }
  | { type: 'SET_LOADING_PLATFORMS'; payload: boolean }
  | { type: 'SET_SOURCE_TYPE'; payload: 'gocnhinmoi' | 'tuoitre' | 'dantri' | 'manual' | null }
  | { type: 'SET_ARTICLE_URL'; payload: string }
  | { type: 'SET_ARTICLE_ID'; payload: string | null }
  | { type: 'SET_MANUAL_CONTENT'; payload: { title: string; content: string } }
  | { type: 'SET_CRAWL_JOB'; payload: { jobId: string; status: 'idle' | 'crawling' | 'done' | 'error' } }
  | { type: 'SET_CRAWL_STATUS'; payload: 'idle' | 'crawling' | 'done' | 'error' }
  | { type: 'SET_ARTICLE_CONTEXT'; payload: ArticleContext | null }
  | { type: 'SET_CRAWLED_IMAGES'; payload: string[] }
  | { type: 'SET_PRESETS'; payload: Preset[] }
  | { type: 'SET_SELECTED_PRESET'; payload: string | null }
  | { type: 'SET_SEARCH_PRESET'; payload: string }
  | { type: 'SET_LOADING_PRESETS'; payload: boolean }
  | { type: 'SET_POST_CONTENT'; payload: string }
  | { type: 'SET_DRAFT'; payload: { platform: string; content: string; postId: string | null; generatedPost: GeneratedPost | null } }
  | { type: 'UPDATE_DRAFT_CONTENT'; payload: { platform: string; content: string } }
  | { type: 'SET_GENERATED_POST'; payload: GeneratedPost | null }
  | { type: 'SET_GENERATING_POST'; payload: boolean }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_CHAT_SENDING'; payload: boolean }
  | { type: 'RESTORE_CHAT_STATE'; payload: { messageIndex: number; postContent: string } }
  | { type: 'ADD_HIGHLIGHT_SELECTION'; payload: { id: string; text: string; start: number; end: number } }
  | { type: 'REMOVE_HIGHLIGHT_SELECTION'; payload: string }
  | { type: 'CLEAR_HIGHLIGHT_SELECTIONS' }
  | { type: 'SET_HIGHLIGHT_EDITING'; payload: boolean }
  | { type: 'SET_CONVERSATIONAL_STEP'; payload: number }
  | { type: 'SET_SCHEDULE_MODE'; payload: 'now' | 'scheduled' }
  | { type: 'SET_SCHEDULE_DATE_TIME'; payload: string }
  | { type: 'SET_TIMELINE'; payload: ScheduledPostInfo[] }
  | { type: 'SET_LOADING_TIMELINE'; payload: boolean }
  | { type: 'SET_SCHEDULING'; payload: boolean }
  | { type: 'SET_PUBLISHING_RESULT'; payload: { successful: PlatformType[]; failed: PlatformType[] } }
  | { type: 'CLEAR_AI_GENERATED_STATE' }
  | { type: 'RESET_FLOW' };
