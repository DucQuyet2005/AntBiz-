import { NextRequest, NextResponse } from 'next/server';
import { updatePromptSchema } from '@/backend/modules/prompts/prompt-schemas';
import { requireUserWithRole } from '@/lib/api/auth';
import { formatZodError } from '@/lib/api/zod-error';
import { buildPromptModule, promptActor, promptErrorResponse } from '../_adapter';

type RouteParams = { params: Promise<{ id: string }> };
const PROMPT_ROLES = ['admin', 'marketer_full', 'marketer_content'] as const;

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole([...PROMPT_ROLES]);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  try {
    const data = await buildPromptModule(supabase).get(promptActor(user.id, role), id);
    return NextResponse.json({ data });
  } catch (error) {
    return promptErrorResponse(error, '[GET /api/prompts/[id]] error:');
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole([...PROMPT_ROLES]);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 });
  }

  const parsed = updatePromptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dữ liệu không hợp lệ', details: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const data = await buildPromptModule(supabase).update(promptActor(user.id, role), id, parsed.data);
    return NextResponse.json({ data });
  } catch (error) {
    return promptErrorResponse(error, '[PUT /api/prompts/[id]] error:');
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole([...PROMPT_ROLES]);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  try {
    const data = await buildPromptModule(supabase).delete(promptActor(user.id, role), id);
    return NextResponse.json({ data });
  } catch (error) {
    return promptErrorResponse(error, '[DELETE /api/prompts/[id]] error:');
  }
}

export const PATCH = PUT;
