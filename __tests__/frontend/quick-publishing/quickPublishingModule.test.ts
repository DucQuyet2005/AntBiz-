import { describe, expect, it, vi } from 'vitest';
import {
  QuickPublishingError,
  QuickPublishingModule,
  type CaptionStreamEvent,
  type GenerateCaptionCommand,
  type QuickPublishingClient,
  type QuickPublishingEvent,
  type QuickPublishingPlatform,
} from '@/frontend/modules/quick-publishing';

class FakeClient implements QuickPublishingClient {
  commands: GenerateCaptionCommand[] = [];
  scheduled: Array<{ captionId: string; scheduledAt: string; imageUrls: string[] }> = [];
  failSchedule = new Set<string>();

  async listPresets() { return []; }
  async *generate(command: GenerateCaptionCommand): AsyncIterable<CaptionStreamEvent> {
    this.commands.push(command);
    yield { type: 'text', text: `${command.platform}-${command.variantIndex}` };
    yield { type: 'completed', captionId: `${command.platform}-caption`, articleId: 'article-1' };
  }
  async updateCaption(id: string) { return { id, status: 'draft' }; }
  async createCaption(input: { platform: 'facebook' | 'thread' | 'instagram' }) {
    return { id: `${input.platform}-draft`, status: 'draft' };
  }
  async schedule(input: { captionId: string; scheduledAt: string; imageUrls: string[] }) {
    if (this.failSchedule.has(input.captionId)) throw new Error('raw failure');
    this.scheduled.push(input);
  }
}

const configs = {
  facebook: { presetId: 'fb-preset', customText: '', quickPicks: [], configId: '' },
  threads: { presetId: '', customText: 'Short', quickPicks: ['cta'], configId: 'threads-style' },
  instagram: { presetId: '', customText: '', quickPicks: [], configId: '' },
};

function draft(platform: QuickPublishingPlatform) {
  return {
    variantId: 'A', platform, articleId: 'article-1',
    originalContent: 'original', currentContent: 'edited', compiledContent: 'compiled',
  };
}

describe('QuickPublishingModule', () => {
  it('builds the existing platform × variant commands and projects typed events', async () => {
    const client = new FakeClient();
    const capacity = new QuickPublishingModule(client);
    const events: QuickPublishingEvent[] = [];

    await capacity.generate({
      articleId: 'article-1', platforms: ['facebook', 'threads'], variantIds: ['A', 'B'],
      variantGroupId: 'group-1', basePrompt: 'Base', promptId: 'prompt-1', model: 'model-1',
      platformConfigs: configs,
    }, (event) => events.push(event));

    expect(client.commands).toHaveLength(4);
    expect(client.commands.find((item) => item.platform === 'facebook' && item.variantIndex === 0))
      .toMatchObject({ promptId: 'prompt-1', platformPresetId: 'fb-preset', stylePresetId: 'none' });
    expect(client.commands.find((item) => item.platform === 'threads' && item.variantIndex === 1)?.customPrompt)
      .toContain('Short (Yêu cầu nhanh: Thêm kêu gọi hành động)');
    expect(events).toContainEqual(expect.objectContaining({ type: 'caption-resolved', platform: 'facebook' }));
    expect(events).toContainEqual(expect.objectContaining({ type: 'generation-completed', variantId: 'B' }));
  });

  it('reuses an existing caption and creates platform-normalized drafts', async () => {
    const client = new FakeClient();
    const update = vi.spyOn(client, 'updateCaption');
    const create = vi.spyOn(client, 'createCaption');
    const capacity = new QuickPublishingModule(client);

    await expect(capacity.ensureDraft({ ...draft('facebook'), captionId: 'existing' })).resolves.toBe('existing');
    await expect(capacity.ensureDraft(draft('threads'))).resolves.toBe('thread-draft');
    expect(update).toHaveBeenCalledWith('existing', { edited_content: 'compiled', status: 'draft' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ platform: 'thread', edited_content: 'compiled' }));
  });

  it('preserves partial scheduling results and emits sanitized failures', async () => {
    const client = new FakeClient();
    client.failSchedule.add('thread-draft');
    const capacity = new QuickPublishingModule(client, () => new Date('2026-07-16T00:00:00Z'));
    const events: QuickPublishingEvent[] = [];

    await expect(capacity.schedule({
      connectedPlatforms: ['facebook', 'threads'], imageUrls: ['image.jpg'],
      platforms: [
        { platform: 'facebook', scheduledAt: '2026-07-17T00:00:00Z', draft: draft('facebook') },
        { platform: 'threads', scheduledAt: '2026-07-17T00:00:00Z', draft: draft('threads') },
      ],
    }, (event) => events.push(event))).rejects.toBeInstanceOf(QuickPublishingError);

    expect(client.scheduled).toEqual([expect.objectContaining({ captionId: 'facebook-draft' })]);
    expect(events).toContainEqual(expect.objectContaining({ type: 'platform-scheduled', platform: 'facebook' }));
    expect(events).toContainEqual({
      type: 'platform-schedule-failed', platform: 'threads',
      error: { code: 'SCHEDULE_FAILED', context: { platform: 'threads' } },
    });
  });
});
