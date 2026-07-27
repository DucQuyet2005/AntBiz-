import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GeminiPromptConfigAdapter } from '@/backend/modules/prompt-configs/gemini-prompt-config-adapter';

const mocks = vi.hoisted(() => ({
  getGenerativeModel: vi.fn(),
  generateContent: vi.fn(),
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel = mocks.getGenerativeModel;
  },
}));

describe('GeminiPromptConfigAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateContent.mockResolvedValue({ response: { text: () => ' result ' } });
    mocks.getGenerativeModel.mockReturnValue({ generateContent: mocks.generateContent });
  });

  it('forwards model, system instruction, and JSON response mode', async () => {
    const adapter = new GeminiPromptConfigAdapter('key', 'gemini-custom');
    await expect(adapter.generate({
      systemInstruction: 'system',
      instruction: 'instruction',
      jsonMode: true,
    })).resolves.toBe(' result ');
    expect(mocks.getGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-custom',
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      systemInstruction: 'system',
    });
    expect(mocks.generateContent).toHaveBeenCalledWith('instruction');
  });

  it('uses the default model and omits JSON mode for Wizard text', async () => {
    const adapter = new GeminiPromptConfigAdapter('key');
    await adapter.generate({ systemInstruction: 'system', instruction: 'wizard' });
    expect(mocks.getGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { temperature: 0.2 },
      systemInstruction: 'system',
    });
  });
});
