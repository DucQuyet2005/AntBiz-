import { NextResponse } from 'next/server';
import { GeminiPromptConfigAdapter } from '@/backend/modules/prompt-configs/gemini-prompt-config-adapter';
import { PromptConfigAiError } from '@/backend/modules/prompt-configs/prompt-config-ai-errors';
import { PromptConfigAiModule } from '@/backend/modules/prompt-configs/prompt-config-ai-module';
import type { PromptConfigAiModuleInterface } from '@/backend/modules/prompt-configs/prompt-config-ai-types';

export function buildPromptConfigAiModule(): PromptConfigAiModuleInterface {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new PromptConfigAiError('MISSING_GEMINI_KEY', 'Thiếu GEMINI_API_KEY trong .env');
  }
  return new PromptConfigAiModule(
    new GeminiPromptConfigAdapter(apiKey, process.env.GEMINI_PROMPT_MODEL || 'gemini-3.1-flash-lite')
  );
}

export function promptConfigAiErrorResponse(error: unknown, logLabel: string) {
  if (error instanceof PromptConfigAiError) {
    if (error.cause) console.error(logLabel, error.cause);
    return NextResponse.json({ error: error.clientMessage }, { status: 500 });
  }
  console.error(logLabel, error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Lỗi hệ thống' },
    { status: 500 }
  );
}
