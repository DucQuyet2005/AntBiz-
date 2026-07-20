import { describe, expect, it } from 'vitest';
import {
  creatorFlowReducer,
  initialCreatorFlowState,
} from '@/frontend/modules/creator-flow/use-creator-flow';

describe('Creator Flow state projection', () => {
  it('keeps the exact UTF-16 selection range and clears it', () => {
    const item = { id: 'sel-1', text: '😀 text', start: 4, end: 11 };
    const selected = creatorFlowReducer(initialCreatorFlowState, {
      type: 'ADD_HIGHLIGHT_SELECTION',
      payload: item,
    });
    expect(selected.highlightSelections).toEqual([item]);

    expect(creatorFlowReducer(selected, { type: 'CLEAR_HIGHLIGHT_SELECTIONS' }))
      .toMatchObject({
        highlightSelections: [],
      });
  });

  it('records partial publishing outcomes instead of treating skipped platforms as success', () => {
    const state = creatorFlowReducer(initialCreatorFlowState, {
      type: 'SET_PUBLISHING_RESULT',
      payload: { successful: ['facebook'], failed: ['threads'] },
    });
    expect(state.publishingSucceededPlatforms).toEqual(['facebook']);
    expect(state.publishingFailedPlatforms).toEqual(['threads']);
  });
});
