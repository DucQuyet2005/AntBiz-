import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseCaptionGenerationRepository } from '@/backend/modules/caption-generation/caption-generation-repository';
import { FileDefaultPromptSource } from '@/backend/modules/caption-generation/default-prompt-adapter';

const mocks = vi.hoisted(() => ({ readFile: vi.fn() }));

vi.mock('node:fs/promises', () => ({ readFile: mocks.readFile }));

function clientWith(builder: object) {
  return {
    from: vi.fn(() => builder),
  } as unknown as SupabaseClient;
}

describe('Caption Generation production adapters', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads articles through the authenticated Supabase client', async () => {
    const builder = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'article-1' }, error: null }),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    const userClient = clientWith(builder);
    const serviceClient = clientWith({});
    const repository = new SupabaseCaptionGenerationRepository(userClient, serviceClient);

    await expect(repository.findArticleById('article-1')).resolves.toMatchObject({ id: 'article-1' });
    expect(userClient.from).toHaveBeenCalledWith('articles');
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it('reads scoped Platform Presets through the service-role client', async () => {
    const builder = {
      select: vi.fn(),
      eq: vi.fn(),
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    const userClient = clientWith({});
    const serviceClient = clientWith(builder);
    const repository = new SupabaseCaptionGenerationRepository(userClient, serviceClient);

    await expect(repository.listPlatformPresets('user-1', 'thread')).resolves.toEqual([]);
    expect(serviceClient.from).toHaveBeenCalledWith('platform_presets');
    expect(builder.eq).toHaveBeenCalledWith('platform', 'thread');
  });

  it('replaces article placeholders in the Threads default prompt', async () => {
    mocks.readFile.mockResolvedValue('Title={{title}}\nContent={{content}}');
    const source = new FileDefaultPromptSource();
    await expect(source.getThreadsPrompt({
      id: 'article-1',
      title: 'Article title',
      description: 'Article summary',
    })).resolves.toBe('Title=Article title\nContent=Article summary');
  });
});
