import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { generateQuestionsSchema } from '@/backend/modules/prompt-configs/prompt-config-ai-schemas';
import { formatZodError } from '@/lib/api/zod-error';
import { buildPromptConfigAiModule, promptConfigAiErrorResponse } from '../_ai-adapter';

export async function POST(request: NextRequest) {
  const { unauthorized } = await requireUserWithRole([
    'admin',
    'marketer_full',
    'marketer_content',
  ]);
  if (unauthorized) return unauthorized;

  try {
    const json = await request.json();
    const parsed = generateQuestionsSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const aiModule = buildPromptConfigAiModule();
    const result = await aiModule.generateQuestions(parsed.data);

    return NextResponse.json(result);
  } catch (error) {
    return promptConfigAiErrorResponse(error, '[POST /api/prompt-configs/generate-questions]');
  }
}
