'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformService } from '@/lib/services/creator/platform.service';
import { articleService } from '@/lib/services/creator/article.service';
import { presetService } from '@/lib/services/creator/preset.service';
import { postService, ChatMessage } from '@/lib/services/creator/post.service';
import { scheduleService } from '@/lib/services/creator/schedule.service';
import { CreatorFlowState, CreatorFlowAction } from './creator-flow-types';
import { PlatformType } from '@/lib/services/creator/platform.service';

const initialState: CreatorFlowState = {
  currentStep: 1,
  selectedPlatform: null,
  platforms: [],
  isLoadingPlatforms: false,
  sourceType: null,
  articleUrl: '',
  manualTitle: '',
  manualContent: '',
  crawlJobId: null,
  crawlStatus: 'idle',
  articleContext: null,
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
  highlightedText: '',
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
};

function creatorFlowReducer(state: CreatorFlowState, action: CreatorFlowAction): CreatorFlowState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_PLATFORM':
      return { ...state, selectedPlatform: action.payload };
    case 'SET_PLATFORMS':
      return { ...state, platforms: action.payload };
    case 'SET_LOADING_PLATFORMS':
      return { ...state, isLoadingPlatforms: action.payload };
    case 'SET_SOURCE_TYPE':
      return { ...state, sourceType: action.payload };
    case 'SET_ARTICLE_URL':
      return { ...state, articleUrl: action.payload };
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
      return { ...state, articleContext: action.payload };
    case 'SET_PRESETS':
      return { ...state, presets: action.payload };
    case 'SET_SELECTED_PRESET':
      return { ...state, selectedPresetId: action.payload };
    case 'SET_SEARCH_PRESET':
      return { ...state, searchPresetQuery: action.payload };
    case 'SET_LOADING_PRESETS':
      return { ...state, isLoadingPresets: action.payload };
    case 'SET_POST_CONTENT':
      return { ...state, postContent: action.payload };
    case 'SET_GENERATED_POST':
      return { 
        ...state, 
        generatedPost: action.payload,
        postId: action.payload ? action.payload.id : null,
        postContent: action.payload ? action.payload.content : ''
      };
    case 'SET_GENERATING_POST':
      return { ...state, isGeneratingPost: action.payload };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };
    case 'SET_CHAT_SENDING':
      return { ...state, isChatSending: action.payload };
    case 'SET_HIGHLIGHT_TEXT':
      return { ...state, highlightedText: action.payload };
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
    case 'RESET_FLOW':
      return { ...initialState };
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
  selectPreset: (presetId: string | null) => void;
  searchPresets: (query: string) => void;
  generateAIContent: () => Promise<void>;
  regeneratePostContent: () => Promise<void>;
  editHighlighted: (instruction: string) => Promise<void>;
  sendAssistantChat: (message: string) => Promise<void>;
  confirmPostSchedule: () => Promise<boolean>;
  updateScheduledTime: (postId: string, dayIndex: number, timeStr: string) => void;
}

const CreatorFlowContext = createContext<CreatorFlowContextProps | undefined>(undefined);

export function CreatorFlowProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(creatorFlowReducer, initialState);

  // 1. Fetch platforms connection
  const { data: platformsResponse, isLoading: isLoadingPlatforms } = useQuery({
    queryKey: ['connectedPlatforms'],
    queryFn: () => platformService.getConnectedPlatforms(),
  });

  useEffect(() => {
    if (platformsResponse?.status === 'success' && platformsResponse.data) {
      dispatch({ type: 'SET_PLATFORMS', payload: platformsResponse.data });
    }
    dispatch({ type: 'SET_LOADING_PLATFORMS', payload: isLoadingPlatforms });
  }, [platformsResponse, isLoadingPlatforms]);

  // 2. Fetch presets
  const { data: presetsResponse, isLoading: isLoadingPresets } = useQuery({
    queryKey: ['presetsList'],
    queryFn: () => presetService.getPresets(),
  });

  useEffect(() => {
    if (presetsResponse?.status === 'success' && presetsResponse.data) {
      dispatch({ type: 'SET_PRESETS', payload: presetsResponse.data });
    }
    dispatch({ type: 'SET_LOADING_PRESETS', payload: isLoadingPresets });
  }, [presetsResponse, isLoadingPresets]);

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

  // 4. Polling for crawl job progress
  const { data: crawlStatusResponse } = useQuery({
    queryKey: ['crawlJobStatus', state.crawlJobId],
    queryFn: () => articleService.getCrawlStatus(state.crawlJobId!),
    enabled: !!state.crawlJobId && state.crawlStatus === 'crawling',
    refetchInterval: (query) => {
      const resp = query.state.data;
      if (resp?.status === 'success' && (resp.data?.status === 'done' || resp.data?.status === 'error')) {
        return false;
      }
      return 1000;
    }
  });

  useEffect(() => {
    if (crawlStatusResponse?.status === 'success' && crawlStatusResponse.data) {
      const { status, articleContext } = crawlStatusResponse.data;
      if (status === 'done' && articleContext) {
        dispatch({ type: 'SET_CRAWL_STATUS', payload: 'done' });
        dispatch({ type: 'SET_ARTICLE_CONTEXT', payload: articleContext });
      } else if (status === 'error') {
        dispatch({ type: 'SET_CRAWL_STATUS', payload: 'error' });
      }
    }
  }, [crawlStatusResponse]);

  // Navigation actions
  const nextStep = () => {
    if (state.currentStep < 5) {
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

  // Article crawling initiator
  const startCrawl = async (url: string, source: 'gocnhinmoi' | 'tuoitre' | 'dantri') => {
    dispatch({ type: 'SET_SOURCE_TYPE', payload: source });
    dispatch({ type: 'SET_ARTICLE_URL', payload: url });
    dispatch({ type: 'SET_CRAWL_JOB', payload: { jobId: '', status: 'crawling' } });

    const response = await articleService.crawlArticle(url);
    if (response.status === 'success' && response.data) {
      dispatch({ 
        type: 'SET_CRAWL_JOB', 
        payload: { jobId: response.data.jobId, status: 'crawling' } 
      });
    } else {
      dispatch({ type: 'SET_CRAWL_STATUS', payload: 'error' });
    }
  };

  const submitManualArticle = async (title: string, content: string) => {
    dispatch({ type: 'SET_SOURCE_TYPE', payload: 'manual' });
    dispatch({ type: 'SET_MANUAL_CONTENT', payload: { title, content } });
    dispatch({ type: 'SET_CRAWL_STATUS', payload: 'crawling' });

    const response = await articleService.submitManualArticle(title, content);
    if (response.status === 'success' && response.data) {
      dispatch({ type: 'SET_ARTICLE_CONTEXT', payload: response.data });
      dispatch({ type: 'SET_CRAWL_STATUS', payload: 'done' });
    } else {
      dispatch({ type: 'SET_CRAWL_STATUS', payload: 'error' });
    }
  };

  const selectPreset = (presetId: string | null) => {
    dispatch({ type: 'SET_SELECTED_PRESET', payload: presetId });
  };

  const searchPresets = (query: string) => {
    dispatch({ type: 'SET_SEARCH_PRESET', payload: query });
  };

  // Step 4 content generator (Gemini 2.5 Flash)
  const generateAIContent = async () => {
    if (!state.selectedPlatform || !state.articleContext) return;
    dispatch({ type: 'SET_GENERATING_POST', payload: true });

    const platformName = state.selectedPlatform.charAt(0).toUpperCase() + state.selectedPlatform.slice(1);

    // Initial message from user selecting the platform
    const userMsg: ChatMessage = {
      id: `msg_user_${Math.random()}`,
      sender: 'user',
      text: platformName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg });

    // AI assistant says: Cảm ơn bạn! Tôi đã có đủ thông tin...
    const introMsg: ChatMessage = {
      id: `msg_ai_intro_${Math.random()}`,
      sender: 'ai',
      text: `Cảm ơn bạn! Tôi đã có đủ thông tin. Hãy nhấn "Tạo nội dung" để AI sinh bài đăng cho ${platformName} nhé 🚀`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: introMsg });

    const response = await postService.generatePost(
      state.selectedPlatform,
      state.articleContext,
      state.selectedPresetId
    );

    if (response.status === 'success' && response.data) {
      dispatch({ type: 'SET_GENERATED_POST', payload: response.data });
      
      // Success confirmation message
      const successMsg: ChatMessage = {
        id: `msg_ai_success_${Math.random()}`,
        sender: 'ai',
        text: `✨ Nội dung đã được tạo cho nền tảng ${platformName}! Bạn có thể bôi đen bất kỳ đoạn nào để nhờ tôi chỉnh sửa.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'Gemini 3.1 Flash Lite'
      };
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: successMsg });
    }
    dispatch({ type: 'SET_GENERATING_POST', payload: false });
  };

  // Regenerate entire post (Gemini 2.5 Flash)
  const regeneratePostContent = async () => {
    if (!state.postId) return;
    dispatch({ type: 'SET_GENERATING_POST', payload: true });

    const response = await postService.regeneratePost(state.postId);
    if (response.status === 'success' && response.data) {
      dispatch({ type: 'SET_POST_CONTENT', payload: response.data.newContent });
      
      const successMsg: ChatMessage = {
        id: `msg_ai_${Math.random()}`,
        sender: 'ai',
        text: '🔄 Đã tạo lại toàn bộ bài viết bằng **Gemini 2.5 Flash**.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'Gemini 3.1 Flash Lite'
      };
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: successMsg });
    }
    dispatch({ type: 'SET_GENERATING_POST', payload: false });
  };

  // Edit highlight segment (Gemini 2.5 Flash)
  const editHighlighted = async (instruction: string) => {
    if (!state.postId || !state.highlightedText || !instruction) return;
    dispatch({ type: 'SET_HIGHLIGHT_EDITING', payload: true });

    const response = await postService.editHighlightedSection(
      state.postId,
      state.highlightedText,
      instruction
    );

    if (response.status === 'success' && response.data) {
      const { editedText } = response.data;
      // Search and replace in current content
      const updatedContent = state.postContent.replace(state.highlightedText, editedText);
      dispatch({ type: 'SET_POST_CONTENT', payload: updatedContent });

      // Visual flash indicator helper on edited block can be matched in CSS
      const successMsg: ChatMessage = {
        id: `msg_ai_${Math.random()}`,
        sender: 'ai',
        text: `✏️ Đã sửa đoạn bôi đen bằng **Gemini 2.5 Flash**: "${editedText}"`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'Gemini 3.1 Flash Lite'
      };
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: successMsg });
    }
    dispatch({ type: 'SET_HIGHLIGHT_TEXT', payload: '' });
    dispatch({ type: 'SET_HIGHLIGHT_EDITING', payload: false });
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
    };
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg });
    dispatch({ type: 'SET_CHAT_SENDING', payload: true });

    const response = await postService.sendChatMessage(
      state.postId || 'temp_post',
      message,
      state.chatMessages
    );

    if (response.status === 'success' && response.data) {
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: response.data });
    }
    dispatch({ type: 'SET_CHAT_SENDING', payload: false });
  };

  // Schedule publisher
  const confirmPostSchedule = async (): Promise<boolean> => {
    if (!state.postId) return false;
    dispatch({ type: 'SET_SCHEDULING', payload: true });

    let response;
    if (state.scheduleMode === 'now') {
      response = await scheduleService.publishNow(state.postId);
    } else {
      response = await scheduleService.schedulePost(
        state.postId,
        state.scheduledDateTime,
        state.selectedPlatform || 'facebook'
      );
    }

    dispatch({ type: 'SET_SCHEDULING', payload: false });
    return response.status === 'success';
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
        selectPreset,
        searchPresets,
        generateAIContent,
        regeneratePostContent,
        editHighlighted,
        sendAssistantChat,
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
