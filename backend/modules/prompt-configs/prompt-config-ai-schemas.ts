import { z } from 'zod';

export const analyzeArticleConfigSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export const wizardPromptSchema = z.object({
  platform: z.enum(['facebook', 'thread', 'instagram', 'threads']),
  tone: z.string(),
  length: z.string(),
  emphasis: z.string(),
  variantCount: z.number().int().min(2).max(3),
});

export const generateQuestionsSchema = z.object({
  objectives: z.array(z.string()).optional(),
  objective: z.string().optional(),
  historySummary: z.string().optional(),
});

export type AnalyzeArticleConfigInput = z.infer<typeof analyzeArticleConfigSchema>;
export type WizardPromptInput = z.infer<typeof wizardPromptSchema>;
export type GenerateQuestionsInput = z.infer<typeof generateQuestionsSchema>;
