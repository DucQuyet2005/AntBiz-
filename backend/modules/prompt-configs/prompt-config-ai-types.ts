import type {
  AnalyzeArticleConfigInput,
  WizardPromptInput,
} from './prompt-config-ai-schemas';

export interface AnalyzedPromptConfig {
  tone: string;
  length: string;
  emphasis: string;
}

export interface PromptConfigGeminiGateway {
  generate(input: {
    systemInstruction: string;
    instruction: string;
    jsonMode?: boolean;
  }): Promise<string>;
}

export interface PromptConfigAiModuleInterface {
  analyzeArticle(input: AnalyzeArticleConfigInput): Promise<AnalyzedPromptConfig>;
  generateWizardPrompt(input: WizardPromptInput): Promise<string>;
}
