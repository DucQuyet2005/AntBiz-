import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GeminiSpeechEnrichmentAdapter,
  parseSpeechMetadata,
} from '@/backend/modules/speech-processing';

const mocks = vi.hoisted(() => ({
  getGenerativeModel: vi.fn(),
  generateContent: vi.fn(),
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel = mocks.getGenerativeModel;
  },
}));

describe('GeminiSpeechEnrichmentAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGenerativeModel.mockReturnValue({ generateContent: mocks.generateContent });
    mocks.generateContent.mockResolvedValue({ response: { text: () => '  Corrected  ' } });
  });

  it('uses key rotation and correction temperature', async () => {
    const rotation = vi.fn(async (_metrics, runner) => runner('gemini-key', 'gemini-model'));
    const adapter = new GeminiSpeechEnrichmentAdapter(rotation as never);

    await expect(adapter.correct('Raw text')).resolves.toBe('Corrected');
    expect(rotation).toHaveBeenCalledWith(
      { title: 'Correction', content: 'Raw text' },
      expect.any(Function)
    );
    expect(mocks.getGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-model',
      generationConfig: { temperature: 0.2 },
    });
    expect(mocks.generateContent).toHaveBeenCalledWith(expect.stringContaining('VĂN BẢN GỐC:'));
    expect(mocks.generateContent).toHaveBeenCalledWith(expect.stringContaining('Raw text'));
  });

  it('uses metadata temperature and parses fenced JSON', async () => {
    mocks.generateContent.mockResolvedValue({
      response: {
        text: () => '```json\n{"title":" Tên ","category":" Công nghệ ","tags":" #ai,   #web "}\n```',
      },
    });
    const rotation = vi.fn(async (_metrics, runner) => runner('gemini-key', 'gemini-model'));
    const adapter = new GeminiSpeechEnrichmentAdapter(rotation as never);

    await expect(adapter.generateMetadata('Content')).resolves.toEqual({
      title: 'Tên',
      category: 'Công nghệ',
      tags: '#ai, #web',
    });
    expect(mocks.getGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-model',
      generationConfig: { temperature: 0.7 },
    });
    expect(mocks.generateContent).toHaveBeenCalledWith(expect.stringContaining('NỘI DUNG:'));
  });

  it('returns empty metadata for malformed or non-object output', () => {
    expect(parseSpeechMetadata('not json')).toEqual({ title: '', category: '', tags: '' });
    expect(parseSpeechMetadata('[]')).toEqual({ title: '', category: '', tags: '' });
  });
});
