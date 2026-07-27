import { describe, expect, it } from 'vitest';
import {
  evaluateGeminiComplexity,
  selectGeminiModel,
} from '@/backend/modules/gemini-capacity/model-selection';
import { classifyGeminiProviderError } from '@/backend/modules/gemini-capacity/provider-error-classifier';

describe('Gemini Capacity model selection', () => {
  it('preserves layout and size complexity thresholds', () => {
    expect(evaluateGeminiComplexity({ title: '', content: 'short' })).toBe('low');
    expect(evaluateGeminiComplexity({ title: '', content: 'word '.repeat(120) })).toBe('medium');
    expect(evaluateGeminiComplexity({ title: '', content: 'word '.repeat(501) })).toBe('high');
    expect(evaluateGeminiComplexity({ title: '', content: 'short', layout: 'dmagazine' })).toBe('high');
    expect(evaluateGeminiComplexity({ title: '', content: 'short', layout: 'megastory' })).toBe('high');
    expect(evaluateGeminiComplexity({ title: '', content: 'short', layout: 'tamdiem' })).toBe('high');
  });

  it('selects configured tier models with compatibility defaults', () => {
    const environment = {
      GEMINI_MODEL: 'base-model',
      GEMINI_HIGH_MODEL: 'high-model',
      GEMINI_MEDIUM_MODEL: 'medium-model',
      GEMINI_LOW_MODEL: 'low-model',
    };

    expect(selectGeminiModel('high', environment)).toBe('high-model');
    expect(selectGeminiModel('medium', environment)).toBe('medium-model');
    expect(selectGeminiModel('low', environment)).toBe('low-model');
    expect(selectGeminiModel('medium', {})).toBe('gemini-3.5-flash');
    expect(selectGeminiModel('low', {})).toBe('gemini-3.1-flash-lite');
  });
});

describe('Gemini provider error classification', () => {
  it('classifies quota before broad credential messages', () => {
    expect(classifyGeminiProviderError({ status: 429, message: 'API key quota exceeded' }))
      .toBe('quota');
  });

  it('classifies explicit credential failures', () => {
    expect(classifyGeminiProviderError({ status: 401, message: 'unauthorized' }))
      .toBe('credential');
    expect(classifyGeminiProviderError({ status: 400, message: 'API key not valid' }))
      .toBe('credential');
  });

  it('requires model evidence before treating a 404 as configuration failure', () => {
    expect(classifyGeminiProviderError({ status: 404, message: 'Model gemini-x not found' }))
      .toBe('model_configuration');
    expect(classifyGeminiProviderError({ status: 404, message: 'Endpoint not found' }))
      .toBe('transient');
  });

  it('treats network, provider 5xx, and unknown errors as transient', () => {
    expect(classifyGeminiProviderError(new TypeError('fetch failed'))).toBe('transient');
    expect(classifyGeminiProviderError({ status: 503, message: 'unavailable' })).toBe('transient');
    expect(classifyGeminiProviderError('unknown')).toBe('transient');
  });
});
