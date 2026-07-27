import { describe, expect, it } from 'vitest';
import { reduceQuickPublishingExecution } from '@/frontend/modules/quick-publishing';

describe('Quick Publishing React adapter state', () => {
  it('projects execution and module event transitions without transport knowledge', () => {
    const initial = {
      isGenerating: false,
      regeneratingVariantId: null,
      isScheduling: false,
      isPublishing: false,
      lastEvent: null,
    };
    const generating = reduceQuickPublishingExecution(initial, { type: 'generation', active: true });
    const projected = reduceQuickPublishingExecution(generating, {
      type: 'event',
      event: {
        type: 'generation-completed', platform: 'facebook', variantId: 'A',
        variantIndex: 0, content: 'result',
      },
    });
    const idle = reduceQuickPublishingExecution(projected, { type: 'generation', active: false });

    expect(generating.isGenerating).toBe(true);
    expect(projected.lastEvent).toEqual(expect.objectContaining({
      type: 'generation-completed', platform: 'facebook', variantId: 'A',
    }));
    expect(idle.isGenerating).toBe(false);
  });
});
