import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { buildPromptModule, promptActor, promptErrorResponse } from '../../_adapter';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole([
    'admin',
    'marketer_full',
    'marketer_content',
  ]);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  try {
    const data = await buildPromptModule(supabase).clone(promptActor(user.id, role), id);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return promptErrorResponse(error, '[POST /api/prompts/[id]/clone] error:');
  }
}
