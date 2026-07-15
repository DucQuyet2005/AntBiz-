import { NextRequest, NextResponse } from 'next/server';
import { updatePromptConfigSchema } from '@/backend/modules/prompt-configs/prompt-config-schemas';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildPromptConfigModule,
  promptConfigActor,
  promptConfigErrorResponse,
} from '../_adapter';

type RouteParams = { params: Promise<{ id: string }> };
const PROMPT_CONFIG_ROLES = ['admin', 'marketer_full', 'marketer_content'] as const;

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    const parsed = updatePromptConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const data = await buildPromptConfigModule(supabase).update(
      promptConfigActor(user.id, role),
      id,
      parsed.data
    );
    return NextResponse.json({ data });
  } catch (error) {
    return promptConfigErrorResponse(error, '[PUT Prompt Config Error]:');
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, role, supabase, unauthorized } = await requireUserWithRole([
      ...PROMPT_CONFIG_ROLES,
    ]);
    if (unauthorized) return unauthorized;

    const data = await buildPromptConfigModule(supabase).delete(
      promptConfigActor(user.id, role),
      id
    );
    return NextResponse.json({ data });
  } catch (error) {
    return promptConfigErrorResponse(error, '[DELETE Prompt Config Error]:');
  }
}
