"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  SocialPlatform,
  ArticleContext,
  PostContent,
  ScheduleMode,
  ScheduleTimelineEvent,
} from '@/types/creator';

interface CreatorFlowState {
  step: 1 | 2 | 3 | 4 | 5;
  selectedPlatform: SocialPlatform | null;
  articleContext: ArticleContext | null;
  selectedPresetId: string | null;
  postContent: PostContent | null;
  scheduleMode: ScheduleMode;
  scheduledDateTime: string | null;
  weekTimeline: ScheduleTimelineEvent[];
}

interface CreatorFlowActions {
  setStep: (step: 1 | 2 | 3 | 4 | 5) => void;
  nextStep: () => void;
  prevStep: () => void;
  setPlatform: (platform: SocialPlatform | null) => void;
  setArticleContext: (context: ArticleContext | null) => void;
  setPreset: (presetId: string | null) => void;
  setPostContent: (post: PostContent | null) => void;
  setScheduleMode: (mode: ScheduleMode) => void;
  setScheduledDateTime: (time: string | null) => void;
  setWeekTimeline: (timeline: ScheduleTimelineEvent[]) => void;
  resetFlow: () => void;
}

type CreatorFlowContextType = CreatorFlowState & CreatorFlowActions;

const CreatorFlowContext = createContext<CreatorFlowContextType | undefined>(undefined);

const initialState: CreatorFlowState = {
  step: 1,
  selectedPlatform: null,
  articleContext: null,
  selectedPresetId: null,
  postContent: null,
  scheduleMode: 'scheduled',
  scheduledDateTime: null,
  weekTimeline: [],
};

export const CreatorFlowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CreatorFlowState>(initialState);

  const actions: CreatorFlowActions = {
    setStep: (step) => setState((prev) => ({ ...prev, step })),
    nextStep: () => setState((prev) => ({ ...prev, step: Math.min(5, prev.step + 1) as 1 | 2 | 3 | 4 | 5 })),
    prevStep: () => setState((prev) => ({ ...prev, step: Math.max(1, prev.step - 1) as 1 | 2 | 3 | 4 | 5 })),
    setPlatform: (platform) => setState((prev) => ({ ...prev, selectedPlatform: platform })),
    setArticleContext: (context) => setState((prev) => ({ ...prev, articleContext: context })),
    setPreset: (presetId) => setState((prev) => ({ ...prev, selectedPresetId: presetId })),
    setPostContent: (post) => setState((prev) => ({ ...prev, postContent: post })),
    setScheduleMode: (mode) => setState((prev) => ({ ...prev, scheduleMode: mode })),
    setScheduledDateTime: (time) => setState((prev) => ({ ...prev, scheduledDateTime: time })),
    setWeekTimeline: (timeline) => setState((prev) => ({ ...prev, weekTimeline: timeline })),
    resetFlow: () => setState(initialState),
  };

  return (
    <CreatorFlowContext.Provider value={{ ...state, ...actions }}>
      {children}
    </CreatorFlowContext.Provider>
  );
};

export const useCreatorFlow = () => {
  const context = useContext(CreatorFlowContext);
  if (context === undefined) {
    throw new Error('useCreatorFlow must be used within a CreatorFlowProvider');
  }
  return context;
};
