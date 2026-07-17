'use client';

import { useCallback, useState } from 'react';
import { BrowserQuickPublishingClient } from './quick-publishing-client';
import { QuickPublishingModule } from './quick-publishing-module';
import type {
  DraftInput,
  GenerateBatchInput,
  QuickPublishingClient,
  QuickPublishingEvent,
  QuickPublishingPlatform,
  PublishInput,
  RegenerateCaptionInput,
  ScheduleInput,
} from './quick-publishing-types';

export interface QuickPublishingExecutionState {
  isGenerating: boolean;
  regeneratingVariantId: string | null;
  isScheduling: boolean;
  isPublishing: boolean;
  lastEvent: QuickPublishingEvent | null;
}

const initialState: QuickPublishingExecutionState = {
  isGenerating: false,
  regeneratingVariantId: null,
  isScheduling: false,
  isPublishing: false,
  lastEvent: null,
};

export function reduceQuickPublishingExecution(
  state: QuickPublishingExecutionState,
  action:
    | { type: 'generation'; active: boolean }
    | { type: 'regeneration'; variantId: string | null }
    | { type: 'scheduling'; active: boolean }
    | { type: 'publishing'; active: boolean }
    | { type: 'event'; event: QuickPublishingEvent }
): QuickPublishingExecutionState {
  if (action.type === 'generation') return { ...state, isGenerating: action.active };
  if (action.type === 'regeneration') return { ...state, regeneratingVariantId: action.variantId };
  if (action.type === 'scheduling') return { ...state, isScheduling: action.active };
  if (action.type === 'publishing') return { ...state, isPublishing: action.active };
  return { ...state, lastEvent: action.event };
}

export function useQuickPublishing(client?: QuickPublishingClient) {
  const [capacity] = useState(() => new QuickPublishingModule(
    client ?? new BrowserQuickPublishingClient()
  ));
  const [state, setState] = useState(initialState);

  const project = useCallback((event: QuickPublishingEvent, listener?: (event: QuickPublishingEvent) => void) => {
    setState((current) => reduceQuickPublishingExecution(current, { type: 'event', event }));
    listener?.(event);
  }, []);

  const loadPresets = useCallback((platform: QuickPublishingPlatform, savedPresetId?: string) => (
    capacity.loadPresets(platform, savedPresetId)
  ), [capacity]);

  const generate = useCallback(async (
    input: GenerateBatchInput,
    listener?: (event: QuickPublishingEvent) => void,
    signal?: AbortSignal
  ) => {
    setState((current) => reduceQuickPublishingExecution(current, { type: 'generation', active: true }));
    try {
      await capacity.generate(input, (event) => project(event, listener), signal);
    } finally {
      setState((current) => reduceQuickPublishingExecution(current, { type: 'generation', active: false }));
    }
  }, [capacity, project]);

  const regenerate = useCallback(async (
    input: GenerateBatchInput,
    variantId: string,
    listener?: (event: QuickPublishingEvent) => void,
    signal?: AbortSignal
  ) => {
    setState((current) => reduceQuickPublishingExecution(current, { type: 'regeneration', variantId }));
    try {
      await capacity.generate(
        { ...input, mode: 'regeneration' },
        (event) => project(event, listener),
        signal
      );
    } finally {
      setState((current) => reduceQuickPublishingExecution(current, { type: 'regeneration', variantId: null }));
    }
  }, [capacity, project]);

  const ensureDraft = useCallback((input: DraftInput, listener?: (event: QuickPublishingEvent) => void) => (
    capacity.ensureDraft(input, (event) => project(event, listener))
  ), [capacity, project]);

  const saveEdit = useCallback((input: DraftInput, listener?: (event: QuickPublishingEvent) => void) => (
    capacity.saveEdit(input, (event) => project(event, listener))
  ), [capacity, project]);

  const regenerateCaption = useCallback((
    input: RegenerateCaptionInput,
    listener?: (event: QuickPublishingEvent) => void
  ) => capacity.regenerateCaption(input, (event) => project(event, listener)), [capacity, project]);

  const schedule = useCallback(async (input: ScheduleInput, listener?: (event: QuickPublishingEvent) => void) => {
    setState((current) => reduceQuickPublishingExecution(current, { type: 'scheduling', active: true }));
    try {
      return await capacity.schedule(input, (event) => project(event, listener));
    } finally {
      setState((current) => reduceQuickPublishingExecution(current, { type: 'scheduling', active: false }));
    }
  }, [capacity, project]);

  const publishNow = useCallback(async (input: PublishInput, listener?: (event: QuickPublishingEvent) => void) => {
    setState((current) => reduceQuickPublishingExecution(current, { type: 'publishing', active: true }));
    try {
      return await capacity.publishNow(input, (event) => project(event, listener));
    } finally {
      setState((current) => reduceQuickPublishingExecution(current, { type: 'publishing', active: false }));
    }
  }, [capacity, project]);

  return {
    state, loadPresets, generate, regenerate, ensureDraft, saveEdit,
    regenerateCaption, schedule, publishNow,
  };
}
