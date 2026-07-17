import { describe, expect, it } from 'vitest';
import { PromptConfigAiError } from '@/backend/modules/prompt-configs/prompt-config-ai-errors';
import {
  DEFAULT_ANALYZED_PROMPT_CONFIG,
  PromptConfigAiModule,
} from '@/backend/modules/prompt-configs/prompt-config-ai-module';
import type { PromptConfigGeminiGateway } from '@/backend/modules/prompt-configs/prompt-config-ai-types';

class FakeGemini implements PromptConfigGeminiGateway {
  output = '';
  error: unknown = null;
  lastInput: Parameters<PromptConfigGeminiGateway['generate']>[0] | null = null;
  async generate(input: Parameters<PromptConfigGeminiGateway['generate']>[0]) {
    this.lastInput = input;
    if (this.error) throw this.error;
    return this.output;
  }
}

describe('PromptConfigAiModule', () => {
  it('analyzes article configuration in JSON mode', async () => {
    const gemini = new FakeGemini();
    gemini.output = JSON.stringify({ tone: 'Thân thiện', length: 'Ngắn', emphasis: 'Ưu đãi' });
    const aiModule = new PromptConfigAiModule(gemini);
    await expect(aiModule.analyzeArticle({ title: 'Title', content: 'Body' })).resolves.toEqual({
      tone: 'Thân thiện',
      length: 'Ngắn',
      emphasis: 'Ưu đãi',
    });
    expect(gemini.lastInput).toMatchObject({ jsonMode: true });
    expect(gemini.lastInput?.instruction).toContain('Title');
  });

  it('applies field defaults to incomplete Analyze output', async () => {
    const gemini = new FakeGemini();
    gemini.output = JSON.stringify({ tone: 'Hài hước' });
    const aiModule = new PromptConfigAiModule(gemini);
    await expect(aiModule.analyzeArticle({ title: '', content: '' })).resolves.toEqual({
      ...DEFAULT_ANALYZED_PROMPT_CONFIG,
      tone: 'Hài hước',
    });
  });

  it('returns complete defaults when Analyze JSON or Gemini fails', async () => {
    const gemini = new FakeGemini();
    const aiModule = new PromptConfigAiModule(gemini);
    gemini.output = 'not-json';
    await expect(aiModule.analyzeArticle({ title: '', content: '' }))
      .resolves.toEqual(DEFAULT_ANALYZED_PROMPT_CONFIG);
    gemini.error = new Error('Gemini unavailable');
    await expect(aiModule.analyzeArticle({ title: '', content: '' }))
      .resolves.toEqual(DEFAULT_ANALYZED_PROMPT_CONFIG);
  });

  it('generates and trims a Wizard prompt with all selected inputs', async () => {
    const gemini = new FakeGemini();
    gemini.output = '  Generated prompt  ';
    const aiModule = new PromptConfigAiModule(gemini);
    await expect(aiModule.generateWizardPrompt({
      platform: 'threads',
      tone: 'Hào hùng',
      length: '360 từ',
      emphasis: 'Thương hiệu',
      variantCount: 3,
    })).resolves.toBe('Generated prompt');
    expect(gemini.lastInput).not.toHaveProperty('jsonMode');
    expect(gemini.lastInput?.instruction).toContain('threads');
    expect(gemini.lastInput?.instruction).toContain('Hào hùng');
    expect(gemini.lastInput?.instruction).toContain('3');
  });

  it('wraps Wizard Gemini failures in a typed error', async () => {
    const gemini = new FakeGemini();
    gemini.error = new Error('upstream failed');
    const aiModule = new PromptConfigAiModule(gemini);
    await expect(aiModule.generateWizardPrompt({
      platform: 'facebook',
      tone: 'Professional',
      length: 'Short',
      emphasis: '',
      variantCount: 2,
    })).rejects.toEqual(expect.objectContaining<Partial<PromptConfigAiError>>({
      code: 'WIZARD_GENERATION_FAILED',
      clientMessage: 'upstream failed',
    }));
  });

  describe('generateQuestions robust JSON parsing', () => {
    it('successfully parses clean JSON', async () => {
      const gemini = new FakeGemini();
      gemini.output = JSON.stringify({
        steps: [
          { key: 'tone', question: 'Văn phong?', options: ['A', 'B'] }
        ]
      });
      const aiModule = new PromptConfigAiModule(gemini);
      const result = await aiModule.generateQuestions({ objectives: ['Mục tiêu'] });
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].key).toBe('tone');
    });

    it('successfully parses JSON wrapped in markdown code blocks', async () => {
      const gemini = new FakeGemini();
      gemini.output = `
\`\`\`json
{
  "steps": [
    { "key": "tone", "question": "Văn phong?", "options": ["A", "B"] }
  ]
}
\`\`\`
`;
      const aiModule = new PromptConfigAiModule(gemini);
      const result = await aiModule.generateQuestions({ objectives: ['Mục tiêu'] });
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].key).toBe('tone');
    });

    it('successfully parses JSON with trailing commas', async () => {
      const gemini = new FakeGemini();
      gemini.output = `
{
  "steps": [
    {
      "key": "tone",
      "question": "Văn phong?",
      "options": ["A", "B",],
    },
  ],
}
`;
      const aiModule = new PromptConfigAiModule(gemini);
      const result = await aiModule.generateQuestions({ objectives: ['Mục tiêu'] });
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].key).toBe('tone');
    });
  });
});

