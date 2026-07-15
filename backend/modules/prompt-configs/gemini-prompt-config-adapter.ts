import { GoogleGenerativeAI } from '@google/generative-ai';
import type { PromptConfigGeminiGateway } from './prompt-config-ai-types';

export class GeminiPromptConfigAdapter implements PromptConfigGeminiGateway {
  constructor(
    private readonly apiKey: string,
    private readonly modelName = 'gemini-2.5-flash'
  ) {}

  async generate(input: {
    systemInstruction: string;
    instruction: string;
    jsonMode?: boolean;
  }) {
    const client = new GoogleGenerativeAI(this.apiKey);
    const model = client.getGenerativeModel({
      model: this.modelName,
      ...(input.jsonMode
        ? { generationConfig: { responseMimeType: 'application/json' } }
        : {}),
      systemInstruction: input.systemInstruction,
    });
    const result = await model.generateContent(input.instruction);
    return (await result.response).text();
  }
}
