import { PromptConfigAiError } from './prompt-config-ai-errors';
import {
  ANALYZE_SYSTEM_INSTRUCTION,
  WIZARD_SYSTEM_INSTRUCTION,
  buildAnalyzeInstruction,
  buildWizardInstruction,
} from './prompt-config-ai-prompts';
import type {
  AnalyzeArticleConfigInput,
  WizardPromptInput,
} from './prompt-config-ai-schemas';
import type {
  AnalyzedPromptConfig,
  PromptConfigAiModuleInterface,
  PromptConfigGeminiGateway,
} from './prompt-config-ai-types';

export const DEFAULT_ANALYZED_PROMPT_CONFIG: AnalyzedPromptConfig = {
  tone: 'Chuyên nghiệp',
  length: 'Vừa (200-500 từ)',
  emphasis: '',
};

export class PromptConfigAiModule implements PromptConfigAiModuleInterface {
  constructor(private readonly gemini: PromptConfigGeminiGateway) {}

  async analyzeArticle(input: AnalyzeArticleConfigInput): Promise<AnalyzedPromptConfig> {
    try {
      const text = await this.gemini.generate({
        systemInstruction: ANALYZE_SYSTEM_INSTRUCTION,
        instruction: buildAnalyzeInstruction(input),
        jsonMode: true,
      });
      const parsed = JSON.parse(text.trim()) as Partial<AnalyzedPromptConfig>;
      return {
        tone: typeof parsed.tone === 'string' && parsed.tone
          ? parsed.tone
          : DEFAULT_ANALYZED_PROMPT_CONFIG.tone,
        length: typeof parsed.length === 'string' && parsed.length
          ? parsed.length
          : DEFAULT_ANALYZED_PROMPT_CONFIG.length,
        emphasis: typeof parsed.emphasis === 'string'
          ? parsed.emphasis
          : DEFAULT_ANALYZED_PROMPT_CONFIG.emphasis,
      };
    } catch (error) {
      console.error('[Analyze Article Config Error]:', error);
      return { ...DEFAULT_ANALYZED_PROMPT_CONFIG };
    }
  }

  async generateWizardPrompt(input: WizardPromptInput) {
    try {
      const text = await this.gemini.generate({
        systemInstruction: WIZARD_SYSTEM_INSTRUCTION,
        instruction: buildWizardInstruction(input),
      });
      return text.trim();
    } catch (error) {
      throw new PromptConfigAiError(
        'WIZARD_GENERATION_FAILED',
        error instanceof Error ? error.message : 'Lỗi khi tạo Prompt từ Wizard',
        error
      );
    }
  }
}
