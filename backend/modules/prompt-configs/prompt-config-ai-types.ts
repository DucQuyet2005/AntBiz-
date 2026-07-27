import type {
  AnalyzeArticleConfigInput,
  WizardPromptInput,
  GenerateQuestionsInput,
} from './prompt-config-ai-schemas';

export interface AnalyzedPromptConfig {
  tone: string;
  length: string;
  emphasis: string;
}

export interface GeneratedQuestionStep {
  key: string;
  question: string;
  options: string[];
}

export interface GeneratedQuestionsOutput {
  steps: GeneratedQuestionStep[];
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
  generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestionsOutput>;
}
