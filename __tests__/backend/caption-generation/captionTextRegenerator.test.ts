import { describe, expect, it } from 'vitest';
import { GeminiCaptionTextRegenerator } from '@/backend/modules/caption-generation/caption-text-regenerator';
import type {
  CaptionGenerationRepository,
  GeminiCaptionGateway,
  PlatformPresetRecord,
} from '@/backend/modules/caption-generation/caption-generation-types';

class FakeRepository implements CaptionGenerationRepository {
  preset: PlatformPresetRecord | null = null;
  async findArticleById() { return null; }
  async findArticleByUrl() { return null; }
  async saveCrawledArticle() { return { id: 'unused' }; }
  async findPlatformPresetById() { return this.preset; }
  async listPlatformPresets() { return []; }
  async findStylePresetById() { return null; }
  async findActivePromptById() { return null; }
  async findOldCaptionById() { return null; }
  async findPromptById() { return null; }
  async saveCaption() { return { id: 'unused' }; }
}

class FakeGemini implements GeminiCaptionGateway {
  lastPrompt = '';
  async start(input: Parameters<GeminiCaptionGateway['start']>[0]) {
    this.lastPrompt = input.prompt;
    return (async function* () { yield 'Rewritten '; yield 'section'; })();
  }
}

const baseInput = {
  actorId: 'user-1',
  article: { id: 'article-1', title: 'Title', full_text: 'Source' },
  platform: 'facebook',
  currentContent: 'Original caption',
  instruction: 'Make it concise',
  presetMode: 'none' as const,
};

describe('GeminiCaptionTextRegenerator', () => {
  it('builds a partial-regeneration prompt and collects streamed fragments', async () => {
    const repository = new FakeRepository();
    const gemini = new FakeGemini();
    const result = await new GeminiCaptionTextRegenerator(repository, gemini).generate({
      ...baseInput,
      mode: 'partial',
      selectedText: 'caption',
    });

    expect(result).toBe('Rewritten section');
    expect(gemini.lastPrompt).toContain('Đoạn được chọn: caption');
    expect(gemini.lastPrompt).toContain('Make it concise');
  });

  it('maps inaccessible selected Presets to a typed management error', async () => {
    const repository = new FakeRepository();
    repository.preset = {
      id: 'preset-1', user_id: 'other', platform: 'facebook', rules: 'Private', is_default: false,
    };
    await expect(new GeminiCaptionTextRegenerator(repository, new FakeGemini()).generate({
      ...baseInput,
      mode: 'full',
      presetMode: 'selected',
      platformPresetId: 'preset-1',
    })).rejects.toMatchObject({ code: 'PRESET_NOT_FOUND', status: 404 });
  });
});
