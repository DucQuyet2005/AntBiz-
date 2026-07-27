import type { GeminiComplexity, GeminiWorkload } from './gemini-capacity-types';

const HIGH_COMPLEXITY_LAYOUTS = new Set(['dmagazine', 'megastory', 'tamdiem']);
type GeminiModelEnvironment = Record<string, string | undefined>;

export function evaluateGeminiComplexity(workload: GeminiWorkload): GeminiComplexity {
  const text = `${workload.title || ''} ${workload.content || ''}`;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (workload.layout && HIGH_COMPLEXITY_LAYOUTS.has(workload.layout)) return 'high';
  if (text.length > 3000 || wordCount > 500) return 'high';
  if (text.length < 800 && wordCount < 120) return 'low';
  return 'medium';
}

export function selectGeminiModel(
  complexity: GeminiComplexity,
  environment: GeminiModelEnvironment = process.env
) {
  const baseModel = environment.GEMINI_MODEL || 'gemini-3.5-flash';
  if (complexity === 'high') return environment.GEMINI_HIGH_MODEL || baseModel;
  if (complexity === 'low') return environment.GEMINI_LOW_MODEL || 'gemini-3.1-flash-lite';
  return environment.GEMINI_MEDIUM_MODEL || baseModel;
}
