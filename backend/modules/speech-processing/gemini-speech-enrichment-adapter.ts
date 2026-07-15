import { GoogleGenerativeAI } from '@google/generative-ai';
import { executeWithRotation } from '@/lib/services/geminiRotationManager';
import { CORRECTION_PROMPT, METADATA_PROMPT } from './speech-prompts';
import type { SpeechEnricher, SpeechMetadata } from './speech-processing-types';

type RotationExecutor = <T>(
  metrics: { title: string; content: string },
  runner: (apiKey: string, modelName: string) => Promise<T>
) => Promise<T>;

const EMPTY_METADATA: SpeechMetadata = { title: '', category: '', tags: '' };

export class GeminiSpeechEnrichmentAdapter implements SpeechEnricher {
  constructor(
    private readonly rotationExecutor: RotationExecutor = executeWithRotation
  ) {}

  correct(transcript: string) {
    return this.callGemini(
      `${CORRECTION_PROMPT}\n\nVĂN BẢN GỐC:`,
      transcript,
      0.2,
      'Correction'
    );
  }

  async generateMetadata(content: string): Promise<SpeechMetadata> {
    const raw = await this.callGemini(
      `${METADATA_PROMPT}\n\nNỘI DUNG:`,
      content,
      0.7,
      'MetadataGen'
    );
    return parseSpeechMetadata(raw);
  }

  private async callGemini(
    prompt: string,
    inputText: string,
    temperature: number,
    title: string
  ) {
    const result = await this.rotationExecutor(
      { title, content: inputText },
      async (apiKey, modelName) => {
        const client = new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature },
        });
        const response = await model.generateContent(`${prompt}\n\n---\n${inputText}\n---`);
        return response.response.text();
      }
    );
    return result.trim();
  }
}

export function parseSpeechMetadata(value: string): SpeechMetadata {
  const cleaned = value
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...EMPTY_METADATA };
    const record = parsed as Record<string, unknown>;
    return {
      title: normalizeMetadataField(record.title),
      category: normalizeMetadataField(record.category),
      tags: normalizeMetadataField(record.tags),
    };
  } catch {
    return { ...EMPTY_METADATA };
  }
}

function normalizeMetadataField(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}
