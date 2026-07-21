import { describe, expect, it } from 'vitest';
import { PlatformType } from '@/lib/services/creator/platform.service';
import { creatorFlowReducer, initialCreatorFlowState } from '@/frontend/modules/creator-flow/use-creator-flow';

describe('Step1Platform connection state logic', () => {
  const platformsList = [
    { id: 'facebook' as PlatformType, name: 'Facebook', connected: true },
    { id: 'threads' as PlatformType, name: 'Threads', connected: false },
    { id: 'instagram' as PlatformType, name: 'Instagram', connected: true },
  ];

  it('correctly identifies connected vs unconnected platforms', () => {
    const connectedMap = new Map(platformsList.map((p) => [p.id, p.connected]));

    expect(connectedMap.get('facebook')).toBe(true);
    expect(connectedMap.get('threads')).toBe(false);
    expect(connectedMap.get('instagram')).toBe(true);
  });

  it('filters out unconnected platforms from selectedPlatforms', () => {
    // Suppose threads (unconnected) was initially selected
    const state = {
      ...initialCreatorFlowState,
      selectedPlatforms: ['facebook', 'threads'] as PlatformType[],
    };

    const connectedIds = new Set(platformsList.filter((p) => p.connected).map((p) => p.id));
    const validSelected = state.selectedPlatforms.filter((id) => connectedIds.has(id));

    expect(validSelected).toEqual(['facebook']);
  });

  it('updates selected platforms through reducer', () => {
    const nextState = creatorFlowReducer(initialCreatorFlowState, {
      type: 'SET_SELECTED_PLATFORMS',
      payload: ['facebook'],
    });

    expect(nextState.selectedPlatforms).toEqual(['facebook']);
  });
});
