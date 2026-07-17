import { describe, expect, it } from 'vitest';
import {
  creatorFlowReducer,
  initialCreatorFlowState,
} from '@/frontend/modules/creator-flow/use-creator-flow';

describe('Creator Flow state projection', () => {
  it('keeps the exact UTF-16 selection range and clears it with the selection text', () => {
    const selected = creatorFlowReducer(initialCreatorFlowState, {
      type: 'SET_HIGHLIGHT_SELECTION',
      payload: { text: '😀 text', start: 4, end: 11 },
    });
    expect(selected).toMatchObject({
      highlightedText: '😀 text', highlightSelectionStart: 4, highlightSelectionEnd: 11,
    });

    expect(creatorFlowReducer(selected, { type: 'SET_HIGHLIGHT_TEXT', payload: '' }))
      .toMatchObject({
        highlightedText: '', highlightSelectionStart: null, highlightSelectionEnd: null,
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
