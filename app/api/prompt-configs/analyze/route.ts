import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_ANALYZED_PROMPT_CONFIG } from '@/backend/modules/prompt-configs/prompt-config-ai-module';
import { analyzeArticleConfigSchema } from '@/backend/modules/prompt-configs/prompt-config-ai-schemas';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildPromptConfigAiModule,
  promptConfigAiErrorResponse,
} from '../_ai-adapter';

const PROMPT_CONFIG_AI_ROLES = ['admin', 'marketer_full', 'marketer_content'] as const;

export async function POST(request: NextRequest) {
  try {
    const { unauthorized } = await requireUserWithRole([...PROMPT_CONFIG_AI_ROLES]);
    if (unauthorized) return unauthorized;

    const aiModule = buildPromptConfigAiModule();
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.error('[Analyze Article Config Error]:', error);
      return NextResponse.json({ ...DEFAULT_ANALYZED_PROMPT_CONFIG });
    }

    const parsed = analyzeArticleConfigSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[Analyze Article Config Error]:', parsed.error);
      return NextResponse.json({ ...DEFAULT_ANALYZED_PROMPT_CONFIG });
    }

    return NextResponse.json(await aiModule.analyzeArticle(parsed.data));
  } catch (error) {
    return promptConfigAiErrorResponse(error, '[Analyze Article Config Error]:');
  }
}
