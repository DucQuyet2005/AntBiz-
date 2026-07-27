import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { buildPromptModule, promptErrorResponse } from '../../_adapter';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, unauthorized } = await requireUserWithRole([
    'admin',
    'marketer_full',
    'marketer_content',
  ]);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing prompt id' }, { status: 400 });
  }

  try {
    const newCount = await buildPromptModule(supabase).recordUse(id);
    return NextResponse.json({ success: true, newCount });
  } catch (error) {
    return promptErrorResponse(error, '[POST /api/prompts/:id/use] error:');
  }
}
