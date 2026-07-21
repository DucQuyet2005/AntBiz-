'use client';

import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { postService, ChatMessage } from '@/lib/services/creator/post.service';
import { scheduleService } from '@/lib/services/creator/schedule.service';
import { presetService } from '@/lib/services/creator/preset.service';
import { CreatorFlowState, CreatorFlowAction } from './creator-flow-types';
import { PlatformType } from '@/lib/services/creator/platform.service';
import { BrowserCreatorFlowClient, type CreatorFlowClient } from './creator-flow-client';
import {
  persistManualCreatorSource,
  uploadCreatorSource,
  type CreatorUploadedSource,
} from './creator-source-workflow';
import {
  QuickPublishingError,
  type QuickPublishingEvent,
  useQuickPublishing,
} from '@/frontend/modules/quick-publishing';

export const initialCreatorFlowState: CreatorFlowState = {
  currentStep: 1,
  selectedPlatform: null,
  selectedPlatforms: [],
  platforms: [],
  isLoadingPlatforms: false,
  sourceType: null,
  articleUrl: '',
  articleId: null,
  manualTitle: '',
  manualContent: '',
  crawlJobId: null,
  crawlStatus: 'idle',
  articleContext: null,
  crawledImageUrls: [],
  presets: [],
  selectedPresetId: null,
  searchPresetQuery: '',
  isLoadingPresets: false,
  postContent: '',
  postId: null,
  generatedPost: null,
  isGeneratingPost: false,
  chatMessages: [],
  isChatSending: false,
  highlightSelections: [],
  isHighlightEditing: false,
  conversationalStep: 1,
  scheduleMode: 'now',
  scheduledDateTime: (() => {
    // Default to tomorrow at 09:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    return `${dateStr}T09:00`;
  })(),
  timelinePosts: [],
  isLoadingTimeline: false,
  isScheduling: false,
  publishingSucceededPlatforms: [],
  publishingFailedPlatforms: [],
  drafts: {},
};

export function creatorFlowReducer(state: CreatorFlowState, action: CreatorFlowAction): CreatorFlowState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_PLATFORM': {
      const activePlatform = action.payload;
      const draft = activePlatform ? state.drafts[activePlatform] : null;
      return { 
        ...state, 
        selectedPlatform: activePlatform,
        postContent: draft ? draft.content : '',
        postId: draft ? draft.postId : null,
        generatedPost: draft ? draft.generatedPost : null
      };
    }
    case 'SET_SELECTED_PLATFORMS':
      return { ...state, selectedPlatforms: action.payload };
    case 'SET_PLATFORMS':
      return { ...state, platforms: action.payload };
    case 'SET_LOADING_PLATFORMS':
      return { ...state, isLoadingPlatforms: action.payload };
    case 'SET_SOURCE_TYPE':
      return { ...state, sourceType: action.payload };
    case 'SET_ARTICLE_URL':
      return { ...state, articleUrl: action.payload };
    case 'SET_ARTICLE_ID':
      return { ...state, articleId: action.payload };
    case 'SET_MANUAL_CONTENT':
      return { 
        ...state, 
        manualTitle: action.payload.title, 
        manualContent: action.payload.content 
      };
    case 'SET_CRAWL_JOB':
      return { 
        ...state, 
        crawlJobId: action.payload.jobId, 
        crawlStatus: action.payload.status 
      };
    case 'SET_CRAWL_STATUS':
      return { ...state, crawlStatus: action.payload };
    case 'SET_ARTICLE_CONTEXT':
      return { ...state, articleContext: action.payload, drafts: {}, postContent: '' };
    case 'SET_CRAWLED_IMAGES':
      return { ...state, crawledImageUrls: action.payload };
    case 'SET_PRESETS':
      return { ...state, presets: action.payload };
    case 'SET_SELECTED_PRESET':
      return { ...state, selectedPresetId: action.payload };
    case 'SET_SEARCH_PRESET':
      return { ...state, searchPresetQuery: action.payload };
    case 'SET_LOADING_PRESETS':
      return { ...state, isLoadingPresets: action.payload };
    case 'SET_POST_CONTENT':
      return { 
        ...state, 
        postContent: action.payload,
        drafts: state.selectedPlatform ? {
          ...state.drafts,
          [state.selectedPlatform]: {
            ...state.drafts[state.selectedPlatform] || { content: '', postId: null, generatedPost: null },
            content: action.payload
          }
        } : state.drafts
      };
    case 'SET_DRAFT':
      return {
        ...state,
        drafts: {
          ...state.drafts,
          [action.payload.platform]: {
            content: action.payload.content,
            postId: action.payload.postId,
            generatedPost: action.payload.generatedPost
          }
        },
        // If updating the currently active platform, sync it to primary states
        ...(state.selectedPlatform === action.payload.platform ? {
          postContent: action.payload.content,
          postId: action.payload.postId,
          generatedPost: action.payload.generatedPost
        } : {})
      };
    case 'UPDATE_DRAFT_CONTENT':
      return {
        ...state,
        drafts: {
          ...state.drafts,
          [action.payload.platform]: {
            ...(state.drafts[action.payload.platform] || { content: '', postId: null, generatedPost: null }),
            content: action.payload.content
          }
        },
        ...(state.selectedPlatform === action.payload.platform ? {
          postContent: action.payload.content
        } : {})
      };
    case 'SET_GENERATED_POST':
      return { 
        ...state, 
        generatedPost: action.payload,
        postId: action.payload ? action.payload.id : null,
        postContent: action.payload ? action.payload.content : '',
        drafts: state.selectedPlatform && action.payload ? {
          ...state.drafts,
          [state.selectedPlatform]: {
            content: action.payload.content,
            postId: action.payload.id,
            generatedPost: action.payload
          }
        } : state.drafts
      };
    case 'SET_GENERATING_POST':
      return { ...state, isGeneratingPost: action.payload };
    case 'ADD_CHAT_MESSAGE':
      if (action.payload.id.startsWith('msg_ai_init') && state.chatMessages.some(m => m.id.startsWith('msg_ai_init'))) {
        return state;
      }
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };
    case 'SET_CHAT_SENDING':
      return { ...state, isChatSending: action.payload };
    case 'RESTORE_CHAT_STATE': {
      const { messageIndex, postContent } = action.payload;
      const truncatedMessages = state.chatMessages.slice(0, messageIndex);
      return {
        ...state,
        chatMessages: truncatedMessages,
        postContent,
        drafts: state.selectedPlatform ? {
          ...state.drafts,
          [state.selectedPlatform]: {
            ...(state.drafts[state.selectedPlatform] || { content: '', postId: null, generatedPost: null }),
            content: postContent,
          }
        } : state.drafts,
      };
    }

    case 'ADD_HIGHLIGHT_SELECTION':
      return {
        ...state,
        highlightSelections: [...state.highlightSelections.filter(s => s.id !== action.payload.id), action.payload].sort((a, b) => a.start - b.start),
      };
    case 'REMOVE_HIGHLIGHT_SELECTION':
      return {
        ...state,
        highlightSelections: state.highlightSelections.filter(s => s.id !== action.payload),
      };
    case 'CLEAR_HIGHLIGHT_SELECTIONS':
      return {
        ...state,
        highlightSelections: [],
      };
    case 'SET_HIGHLIGHT_EDITING':
      return { ...state, isHighlightEditing: action.payload };
    case 'SET_CONVERSATIONAL_STEP':
      return { ...state, conversationalStep: action.payload };
    case 'SET_SCHEDULE_MODE':
      return { ...state, scheduleMode: action.payload };
    case 'SET_SCHEDULE_DATE_TIME':
      return { ...state, scheduledDateTime: action.payload };
    case 'SET_TIMELINE':
      return { ...state, timelinePosts: action.payload };
    case 'SET_LOADING_TIMELINE':
      return { ...state, isLoadingTimeline: action.payload };
    case 'SET_SCHEDULING':
      return { ...state, isScheduling: action.payload };
    case 'SET_PUBLISHING_RESULT':
      return {
        ...state,
        publishingSucceededPlatforms: action.payload.successful,
        publishingFailedPlatforms: action.payload.failed,
      };
    case 'CLEAR_AI_GENERATED_STATE':
      return {
        ...state,
        generatedPost: null,
        postId: null,
        postContent: '',
        drafts: {},
        chatMessages: [],
        highlightSelections: [],
        conversationalStep: 1,
      };
    case 'RESET_FLOW':
      return { ...initialCreatorFlowState };
    default:
      return state;
  }
}

interface CreatorFlowContextProps {
  state: CreatorFlowState;
  dispatch: React.Dispatch<CreatorFlowAction>;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  selectPlatform: (platform: PlatformType | null) => void;
  startCrawl: (url: string, source: 'gocnhinmoi' | 'tuoitre' | 'dantri') => Promise<void>;
  submitManualArticle: (title: string, content: string) => Promise<void>;
  uploadSourceFile: (file: File) => Promise<CreatorUploadedSource>;
  selectPreset: (presetId: string | null) => void;
  searchPresets: (query: string) => void;
  generateAIContent: () => Promise<void>;
  regeneratePostContent: (presetId?: string | null) => Promise<void>;
  editHighlighted: (instruction: string) => Promise<void>;
  sendAssistantChat: (message: string) => Promise<void>;
  restoreChatState: (messageIndex: number, overrideContent?: string) => { userPrompt?: string; quotedText?: string; restoredContent?: string };
  confirmPostSchedule: (mode?: 'now' | 'scheduled') => Promise<{
    success: boolean;
    failed: PlatformType[];
  }>;
  updateScheduledTime: (postId: string, dayIndex: number, timeStr: string) => void;
}

const CreatorFlowContext = createContext<CreatorFlowContextProps | undefined>(undefined);

export function CreatorFlowProvider({
  children,
  client,
}: {
  children: React.ReactNode;
  client?: CreatorFlowClient;
}) {
  const [state, dispatch] = useReducer(creatorFlowReducer, initialCreatorFlowState);
  const [creatorClient] = useState(() => client ?? new BrowserCreatorFlowClient());
  const quickPublishing = useQuickPublishing();

  // 1. Fetch platforms connection
  const { data: platforms, isLoading: isLoadingPlatforms } = useQuery({
    queryKey: ['connectedPlatforms'],
    queryFn: () => creatorClient.listConnectedPlatforms(),
  });

  useEffect(() => {
    if (platforms) {
      dispatch({ type: 'SET_PLATFORMS', payload: platforms });
      const connectedIds = new Set(platforms.filter((p) => p.connected).map((p) => p.id));
      const validSelected = state.selectedPlatforms.filter((id) => connectedIds.has(id));
      if (validSelected.length !== state.selectedPlatforms.length) {
        dispatch({ type: 'SET_SELECTED_PLATFORMS', payload: validSelected });
      }
    }
    dispatch({ type: 'SET_LOADING_PLATFORMS', payload: isLoadingPlatforms });
  }, [platforms, isLoadingPlatforms, state.selectedPlatforms]);

  // 2. Fetch presets
  const { data: presets, isLoading: isLoadingPresets } = useQuery({
    queryKey: ['creatorPlatformPresets'],
    queryFn: async () => {
      const res = await presetService.getPresets();
      if (res.status === 'success' && res.data) {
        return res.data;
      }
      return [];
    },
  });

  useEffect(() => {
    if (presets) {
      dispatch({ type: 'SET_PRESETS', payload: presets });
      if (presets.length > 0 && !state.selectedPresetId) {
        const defaultPreset = presets.find(p => p.isDefault);
        if (defaultPreset) {
          dispatch({ type: 'SET_SELECTED_PRESET', payload: defaultPreset.id });
        }
      }
    }
    dispatch({ type: 'SET_LOADING_PRESETS', payload: isLoadingPresets });
  }, [presets, isLoadingPresets]);

  // 3. Fetch Weekly Timeline schedule grid
  const { data: timelineResponse, isLoading: isLoadingTimeline } = useQuery({
    queryKey: ['weeklyTimeline'],
    queryFn: () => scheduleService.getTimeline(),
  });

  useEffect(() => {
    if (timelineResponse?.status === 'success' && timelineResponse.data) {
      dispatch({ type: 'SET_TIMELINE', payload: timelineResponse.data });
    }
    dispatch({ type: 'SET_LOADING_TIMELINE', payload: isLoadingTimeline });
  }, [timelineResponse, isLoadingTimeline]);

  // Navigation actions
  const nextStep = () => {
    if (state.currentStep < 4) {
      dispatch({ type: 'SET_STEP', payload: state.currentStep + 1 });
    }
  };

  const prevStep = () => {
    if (state.currentStep > 1) {
      dispatch({ type: 'SET_STEP', payload: state.currentStep - 1 });
    }
  };

  const goToStep = (step: number) => {
    dispatch({ type: 'SET_STEP', payload: step });
  };

  const selectPlatform = (platform: PlatformType | null) => {
    dispatch({ type: 'SET_PLATFORM', payload: platform });
  };

  const beginSourceIngestion = () => {
    dispatch({ type: 'SET_ARTICLE_ID', payload: null });
    dispatch({ type: 'SET_ARTICLE_CONTEXT', payload: null });
    dispatch({ type: 'SET_CRAWL_STATUS', payload: 'crawling' });
  };

  const completeSourceIngestion = (result: Awaited<ReturnType<CreatorFlowClient['createManualArticle']>>) => {
    dispatch({ type: 'SET_ARTICLE_ID', payload: result.articleId });
    dispatch({ type: 'SET_ARTICLE_CONTEXT', payload: result.context });
    dispatch({ type: 'SET_CRAWL_STATUS', payload: 'done' });
  };

  // Article crawling initiator
  const startCrawl = async (url: string, source: 'gocnhinmoi' | 'tuoitre' | 'dantri') => {
    dispatch({ type: 'SET_SOURCE_TYPE', payload: source });
    dispatch({ type: 'SET_ARTICLE_URL', payload: url });
    dispatch({ type: 'SET_CRAWL_JOB', payload: { jobId: url, status: 'crawling' } });

    try {
      const result = await creatorClient.ingestUrl(url);
      dispatch({ type: 'SET_ARTICLE_ID', payload: result.articleId });
      dispatch({ type: 'SET_ARTICLE_CONTEXT', payload: result.context });
      // Collect all images from article context for use in Step 3+ publish
      const rawUrls = (result.context as any).imageUrls || (result.context.thumbnail ? [result.context.thumbnail] : []);
      const crawledImages: string[] = rawUrls.filter(
        (u: unknown) => typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'))
      );
      dispatch({ type: 'SET_CRAWLED_IMAGES', payload: Array.from(new Set(crawledImages)) });
      dispatch({ type: 'SET_CRAWL_STATUS', payload: 'done' });
    } catch {
      dispatch({ type: 'SET_CRAWL_STATUS', payload: 'error' });
    }
  };

  const submitManualArticle = async (title: string, content: string) => {
    dispatch({ type: 'SET_SOURCE_TYPE', payload: 'manual' });
    dispatch({ type: 'SET_MANUAL_CONTENT', payload: { title, content } });
    beginSourceIngestion();

    try {
      const result = await persistManualCreatorSource(creatorClient, title, content);
      completeSourceIngestion(result);
    } catch (error) {
      dispatch({ type: 'SET_CRAWL_STATUS', payload: 'error' });
      throw error;
    }
  };

  const uploadSourceFile = async (file: File) => {
    dispatch({ type: 'SET_SOURCE_TYPE', payload: 'manual' });
    beginSourceIngestion();

    try {
      const uploaded = await uploadCreatorSource(creatorClient, file);
      
      let newTitle = uploaded.article.context.title;
      let newContent = uploaded.content;
      
      if (state.manualContent && state.manualContent.trim().length > 0) {
        newTitle = state.manualTitle || newTitle;
        newContent = `${state.manualContent}\n\n[Nội dung bổ sung từ ghi âm/tệp đính kèm]:\n${uploaded.content}`;
      }

      dispatch({
        type: 'SET_MANUAL_CONTENT',
        payload: { title: newTitle, content: newContent },
      });
      completeSourceIngestion(uploaded.article);
      return uploaded;
    } catch (error) {
      dispatch({ type: 'SET_CRAWL_STATUS', payload: 'error' });
      throw error;
    }
  };

  const selectPreset = (presetId: string | null) => {
    dispatch({ type: 'SET_SELECTED_PRESET', payload: presetId });
  };

  const searchPresets = (query: string) => {
    dispatch({ type: 'SET_SEARCH_PRESET', payload: query });
  };

  const presetForPlatform = (
    platform: PlatformType,
    selectedPresetId: string | null = state.selectedPresetId
  ) => {
    const selected = state.presets.find((preset) => preset.id === selectedPresetId);
    return selected?.platform === platform ? selected.id : '';
  };

  const draftInputFor = (platform: PlatformType) => {
    const draft = state.drafts[platform];
    if (!draft) return null;
    return {
      variantId: platform,
      platform,
      articleId: state.articleId || undefined,
      captionId: draft.postId || undefined,
      originalContent: draft.generatedPost?.content || draft.content,
      currentContent: draft.content,
      compiledContent: draft.content,
    };
  };

  const generatedPost = (platform: PlatformType, id: string, content: string) => ({
    id,
    platform,
    title: state.articleContext?.title || '',
    content,
    status: 'draft' as const,
  });

  const reportOperationError = (text: string) => {
    const message: ChatMessage = {
      id: `msg_error_${Date.now()}`,
      sender: 'ai',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: message });
  };

  // Step 4 content generator through the Quick Publishing interface.
  const generateAIContent = async () => {
    const targetPlatforms = state.selectedPlatforms.length > 0 
      ? state.selectedPlatforms 
      : (state.selectedPlatform ? [state.selectedPlatform] : []);

    if (targetPlatforms.length === 0 || !state.articleContext || !state.articleId) return;
    dispatch({ type: 'SET_GENERATING_POST', payload: true });

    // Set first platform as active if not already selected
    const firstPlatform = targetPlatforms[0];
    if (firstPlatform && state.selectedPlatform !== firstPlatform) {
      dispatch({ type: 'SET_PLATFORM', payload: firstPlatform });
    }

    const contents = new Map<PlatformType, string>();
    const captionIds = new Map<PlatformType, string>();
    const failedPlatforms = new Set<PlatformType>();
    const onEvent = (event: QuickPublishingEvent) => {
      if (event.type === 'article-resolved') {
        dispatch({ type: 'SET_ARTICLE_ID', payload: event.articleId });
        return;
      }
      if (!('platform' in event) || !targetPlatforms.includes(event.platform)) return;
      const platform = event.platform;
      if (event.type === 'generation-failed') failedPlatforms.add(platform);
      if (event.type === 'text-fragment') contents.set(platform, event.accumulated);
      if (event.type === 'caption-resolved') captionIds.set(platform, event.captionId);
      if (event.type === 'text-fragment' || event.type === 'caption-resolved') {
        const content = contents.get(platform) || '';
        const captionId = captionIds.get(platform) || '';
        dispatch({
          type: 'SET_DRAFT',
          payload: {
            platform, content, postId: captionId || null,
            generatedPost: generatedPost(platform, captionId, content),
          },
        });
      }
    };

    try {
      const configFor = (platform: PlatformType) => ({
        presetId: '',
        customText: '',
        quickPicks: [],
        configId: state.selectedPresetId || '',
      });
      await quickPublishing.generate({
        articleId: state.articleId,
        platforms: targetPlatforms,
        variantIds: ['primary'],
        variantIndexes: [0],
        variantGroupId: `creator-${Date.now()}`,
        basePrompt: '',
        platformConfigs: {
          facebook: configFor('facebook'),
          threads: configFor('threads'),
          instagram: configFor('instagram'),
        },
      }, onEvent);
      for (const platform of targetPlatforms) {
        const content = contents.get(platform) || '';
        const captionId = captionIds.get(platform) || '';
        if (!content || !captionId) continue;
        dispatch({
          type: 'SET_DRAFT',
          payload: {
            platform, content, postId: captionId,
            generatedPost: generatedPost(platform, captionId, content),
          },
        });
      }
      if (failedPlatforms.size > 0) {
        reportOperationError(
          `Không thể tạo nội dung cho: ${Array.from(failedPlatforms).join(', ')}.`
        );
      }
    } catch {
      reportOperationError('Không thể tạo nội dung lúc này. Vui lòng kiểm tra nguồn bài viết và thử lại.');
    } finally {
      dispatch({ type: 'SET_GENERATING_POST', payload: false });
    }
  };

  // Regenerate the complete persisted Caption.
  const regeneratePostContent = async (presetOverride?: string | null) => {
    if (!state.selectedPlatform) return;
    const draft = draftInputFor(state.selectedPlatform);
    if (!draft) return;
    dispatch({ type: 'SET_GENERATING_POST', payload: true });

    try {
      const captionId = await quickPublishing.saveEdit(draft);
      const result = await quickPublishing.regenerateCaption({
        captionId,
        platform: state.selectedPlatform,
        mode: 'full',
        presetMode: 'auto',
      });
      dispatch({
        type: 'SET_DRAFT',
        payload: {
          platform: state.selectedPlatform, content: result.content, postId: result.captionId,
          generatedPost: generatedPost(state.selectedPlatform, result.captionId, result.content),
        },
      });
    } catch (error) {
      reportOperationError('Không thể tạo lại toàn bộ bài viết lúc này.');
    } finally {
      dispatch({ type: 'SET_GENERATING_POST', payload: false });
    }
  };

  // Regenerate the exact selected UTF-16 ranges in the persisted Caption.
  const editHighlighted = async (instruction: string) => {
    if (
      !state.selectedPlatform || state.highlightSelections.length === 0 || !instruction
    ) return;
    const draft = draftInputFor(state.selectedPlatform);
    if (!draft) return;
    dispatch({ type: 'SET_HIGHLIGHT_EDITING', payload: true });

    try {
      // 1. Add User Message to Chat Log
      const selectedTexts = state.highlightSelections.map(s => s.text).join('\n---\n');
      const userMsg: ChatMessage = {
        id: `msg_user_${Math.random()}`,
        sender: 'user',
        text: instruction,
        quotedText: selectedTexts,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        postContentSnapshot: state.postContent,
      };
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg });

      const captionId = await quickPublishing.saveEdit(draft);
      const result = await quickPublishing.regenerateCaption({
        captionId,
        platform: state.selectedPlatform,
        mode: 'partial',
        selections: state.highlightSelections.map(s => ({ start: s.start, end: s.end, text: s.text })),
        instruction,
        presetMode: 'auto',
      });

      // 2. Add AI Response Message to Chat Log
      const aiMsg: ChatMessage = {
        id: `msg_ai_${Math.random()}`,
        sender: 'ai',
        text: `Đoạn viết mới: ${result.generatedText}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'Gemini 2.5 Flash',
        postContentSnapshot: result.content,
      };
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: aiMsg });

      dispatch({
        type: 'SET_DRAFT',
        payload: {
          platform: state.selectedPlatform, content: result.content, postId: result.captionId,
          generatedPost: generatedPost(state.selectedPlatform, result.captionId, result.content),
        },
      });
    } catch (error) {
      reportOperationError(
        error instanceof QuickPublishingError && error.code === 'CAPTION_STALE'
          ? 'Nội dung đã thay đổi. Vui lòng chọn lại đoạn cần sửa.'
          : 'Không thể sửa đoạn đã chọn lúc này.'
      );
    } finally {
      dispatch({ type: 'CLEAR_HIGHLIGHT_SELECTIONS' });
      dispatch({ type: 'SET_HIGHLIGHT_EDITING', payload: false });
    }
  };

  // Assistant chatbot conversation (Gemini 3.1 Flash Lite)
  const sendAssistantChat = async (message: string) => {
    if (!message.trim()) return;
    
    // User message
    const userMsg: ChatMessage = {
      id: `msg_user_${Math.random()}`,
      sender: 'user',
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      postContentSnapshot: state.postContent,
    };
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg });
    dispatch({ type: 'SET_CHAT_SENDING', payload: true });

    const response = await postService.sendChatMessage(
      state.postId || 'temp_post',
      message,
      state.chatMessages
    );

    if (response.status === 'success' && response.data) {
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: {
          ...response.data,
          postContentSnapshot: state.postContent,
        },
      });
    }
    dispatch({ type: 'SET_CHAT_SENDING', payload: false });
  };

  const restoreChatState = (messageIndex: number, overrideContent?: string) => {
    const targetMsg = state.chatMessages[messageIndex];
    let restoredContent = overrideContent;
    if (!restoredContent) {
      for (let i = messageIndex; i >= 0; i--) {
        if (state.chatMessages[i]?.postContentSnapshot) {
          restoredContent = state.chatMessages[i].postContentSnapshot;
          break;
        }
      }
    }
    restoredContent = restoredContent ?? state.postContent;

    let quotedText = targetMsg?.quotedText;
    let userPrompt = targetMsg?.text;

    if (!quotedText && userPrompt?.startsWith('[Sửa đoạn:')) {
      const match = userPrompt.match(/^\[Sửa đoạn:\s*(.+?)\]:\s*(.+)$/s);
      if (match) {
        quotedText = match[1];
        userPrompt = match[2];
      }
    }

    dispatch({
      type: 'RESTORE_CHAT_STATE',
      payload: { messageIndex, postContent: restoredContent },
    });

    return {
      userPrompt: targetMsg?.sender === 'user' ? userPrompt : undefined,
      quotedText,
      restoredContent,
    };
  };

  const confirmPostSchedule = async (
    requestedMode: 'now' | 'scheduled' = state.scheduleMode
  ): Promise<{ success: boolean; failed: PlatformType[] }> => {
    const targetPlatforms = state.selectedPlatforms.length > 0 
      ? state.selectedPlatforms 
      : (state.selectedPlatform ? [state.selectedPlatform] : []);

    if (targetPlatforms.length === 0) return { success: false, failed: [] };
    dispatch({ type: 'SET_SCHEDULING', payload: true });
    const drafts = targetPlatforms.map((platform) => ({ platform, draft: draftInputFor(platform) }));
    const missing = drafts.filter((item) => !item.draft).map((item) => item.platform);
    if (missing.length > 0) {
      dispatch({ type: 'SET_PUBLISHING_RESULT', payload: { successful: [], failed: missing } });
      dispatch({ type: 'SET_SCHEDULING', payload: false });
      return { success: false, failed: missing };
    }

    const connectedPlatforms = state.platforms
      .filter((platform) => platform.connected)
      .map((platform) => platform.id);
    const imageUrls = [
      ...(state.articleContext?.thumbnail ? [state.articleContext.thumbnail] : []),
      ...state.crawledImageUrls.filter(url => url !== state.articleContext?.thumbnail),
    ];
    let successful: PlatformType[] = [];
    let failed: PlatformType[] = [];
    const onEvent = (event: QuickPublishingEvent) => {
      if (event.type === 'publish-completed' || event.type === 'schedule-completed') {
        successful = event.successful;
        failed = event.failed;
        dispatch({ type: 'SET_PUBLISHING_RESULT', payload: { successful, failed } });
      }
    };

    try {
      if (requestedMode === 'now') {
        await quickPublishing.publishNow({
          connectedPlatforms,
          imageUrls,
          platforms: drafts.map((item) => ({ platform: item.platform, draft: item.draft! })),
        }, onEvent);
      } else {
        const scheduledAt = new Date(state.scheduledDateTime).toISOString();
        await quickPublishing.schedule({
          connectedPlatforms,
          imageUrls,
          platforms: drafts.map((item) => ({
            platform: item.platform,
            scheduledAt,
            draft: item.draft!,
          })),
        }, onEvent);
      }
      return {
        success: failed.length === 0 && successful.length === targetPlatforms.length,
        failed,
      };
    } catch {
      const failedPlatforms = failed.length > 0 ? failed : targetPlatforms;
      if (failed.length === 0) {
        dispatch({
          type: 'SET_PUBLISHING_RESULT',
          payload: { successful, failed: failedPlatforms },
        });
      }
      return { success: false, failed: failedPlatforms };
    } finally {
      dispatch({ type: 'SET_SCHEDULING', payload: false });
    }
  };

  // Weekly Timeline drag and drop simulation callback
  const updateScheduledTime = (postId: string, dayIndex: number, timeStr: string) => {
    const updated = state.timelinePosts.map((p) => {
      if (p.postId === postId) {
        return { ...p, dayIndex, time: timeStr };
      }
      return p;
    });
    dispatch({ type: 'SET_TIMELINE', payload: updated });
  };

  return (
    <CreatorFlowContext.Provider
      value={{
        state,
        dispatch,
        nextStep,
        prevStep,
        goToStep,
        selectPlatform,
        startCrawl,
        submitManualArticle,
        uploadSourceFile,
        selectPreset,
        searchPresets,
        generateAIContent,
        regeneratePostContent,
        editHighlighted,
        sendAssistantChat,
        restoreChatState,
        confirmPostSchedule,
        updateScheduledTime,
      }}
    >
      {children}
    </CreatorFlowContext.Provider>
  );
}

export function useCreatorFlow() {
  const context = useContext(CreatorFlowContext);
  if (!context) {
    throw new Error('useCreatorFlow must be used within a CreatorFlowProvider');
  }
  return context;
}
