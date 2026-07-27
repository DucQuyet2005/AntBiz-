import { NextRequest, NextResponse } from 'next/server';
import { createPromptConfigSchema } from '@/backend/modules/prompt-configs/prompt-config-schemas';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildPromptConfigModule,
  promptConfigActor,
  promptConfigErrorResponse,
} from './_adapter';

const PROMPT_CONFIG_ROLES = ['admin', 'marketer_full', 'marketer_content'] as const;

export async function GET(request: NextRequest) {
  try {
    const { user, role, supabase, unauthorized } = await requireUserWithRole([
      ...PROMPT_CONFIG_ROLES,
    ]);
    if (unauthorized) return unauthorized;

    const platform = request.nextUrl.searchParams.get('platform') || undefined;
    const data = await buildPromptConfigModule(supabase).list(
      promptConfigActor(user.id, role),
      platform
    );
    return NextResponse.json({ data });
  } catch (error) {
    return promptConfigErrorResponse(error, '[GET Prompt Configs Error]:');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, supabase, unauthorized } = await requireUserWithRole([
      ...PROMPT_CONFIG_ROLES,
    ]);
    if (unauthorized) return unauthorized;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 });
    }

    const parsed = createPromptConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const data = await buildPromptConfigModule(supabase).create(
      promptConfigActor(user.id, role),
      parsed.data
    );
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return promptConfigErrorResponse(error, '[POST Prompt Config Error]:');
  }
}
