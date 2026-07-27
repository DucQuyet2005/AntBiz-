import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { buildPromptModule, promptActor, promptErrorResponse } from '../../_adapter';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole([
    'admin',
    'marketer_full',
    'marketer_content',
  ]);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  try {
    const result = await buildPromptModule(supabase).checkUsage(promptActor(user.id, role), id);
    return NextResponse.json(result);
  } catch (error) {
    return promptErrorResponse(error, '[GET /api/prompts/[id]/check-usage] error:');
  }
}
