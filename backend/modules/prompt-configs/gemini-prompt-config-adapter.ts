import { GoogleGenerativeAI } from '@google/generative-ai';
import type { PromptConfigGeminiGateway } from './prompt-config-ai-types';

export class GeminiPromptConfigAdapter implements PromptConfigGeminiGateway {
  constructor(
    private readonly apiKey: string,
    private readonly modelName = 'gemini-3.1-flash-lite'
  ) {}

  async generate(input: {
    systemInstruction: string;
    instruction: string;
    jsonMode?: boolean;
  }) {
    const client = new GoogleGenerativeAI(this.apiKey);
    const model = client.getGenerativeModel({
      model: this.modelName,
      generationConfig: input.jsonMode
        ? { responseMimeType: 'application/json', temperature: 0.1 }
        : { temperature: 0.2 },
      systemInstruction: input.systemInstruction,
    });
    const result = await model.generateContent(input.instruction);
    return (await result.response).text();
  }
}

