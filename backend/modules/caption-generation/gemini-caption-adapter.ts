import { executeWithRotation } from '@/lib/services/geminiRotationManager';
import type { GeminiCaptionGateway } from './caption-generation-types';

type Sleep = (milliseconds: number) => Promise<void>;

const defaultSleep: Sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export class GeminiCaptionAdapter implements GeminiCaptionGateway {
  constructor(
    private readonly fetchImplementation: typeof fetch = fetch,
    private readonly sleep: Sleep = defaultSleep
  ) {}

  async start(input: {
    title: string;
    content: string;
    prompt: string;
    temperature: number;
  }): Promise<AsyncIterable<string>> {
    const response = await executeWithRotation(
      { title: input.title, content: input.content },
      async (key, modelName) => {
        const modelPath = modelName.startsWith('tunedModels/') ? modelName : `models/${modelName}`;
        const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:streamGenerateContent?key=${key}`;
        const result = await this.fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: input.prompt }] }],
            generationConfig: { temperature: input.temperature },
          }),
        });

        if (!result.ok) {
          const errorText = await result.text();
          throw new Error(`[Gemini API Error] Status: ${result.status}, Body: ${errorText}`);
        }
        return result;
      }
    );

    return this.parseText(response);
  }

  private async fetchWithRetry(url: string, options: RequestInit, retries = 3) {
    let delay = 1000;
    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        const response = await this.fetchImplementation(url, options);
        if (response.status !== 429) return response;
        console.warn(`[Gemini API] Rate limited (429). Retrying in ${delay}ms... (Attempt ${attempt + 1}/${retries})`);
      } catch (error) {
        if (attempt === retries - 1) throw error;
        console.warn(`[Gemini API] Fetch error: ${error}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${retries})`);
      }
      await this.sleep(delay);
      delay *= 2;
    }
    throw new Error('Failed to fetch from Gemini API after maximum retries');
  }

  private async *parseText(response: Response): AsyncIterable<string> {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const regex = /"text":\s*"((?:[^"\\]|\\.)*)"/g;
      let match: RegExpExecArray | null;
      let lastIndex = 0;
      while ((match = regex.exec(buffer)) !== null) {
        const rawText = match[1];
        try {
          yield JSON.parse(`"${rawText}"`) as string;
        } catch {
          yield rawText;
        }
        lastIndex = regex.lastIndex;
      }
      if (lastIndex > 0) buffer = buffer.substring(lastIndex);
    }
  }
}
