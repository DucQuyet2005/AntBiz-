import { NextRequest, NextResponse } from 'next/server';
import { wizardPromptSchema } from '@/backend/modules/prompt-configs/prompt-config-ai-schemas';
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
    } catch {
      return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 });
    }

    const parsed = wizardPromptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const prompt = await aiModule.generateWizardPrompt(parsed.data);
    return NextResponse.json({ prompt });
  } catch (error) {
    return promptConfigAiErrorResponse(error, '[Generate Prompt From Wizard Error]:');
  }
}
