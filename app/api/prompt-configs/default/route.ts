import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildPromptConfigModule,
  promptConfigActor,
  promptConfigErrorResponse,
} from '../_adapter';

export async function GET(request: NextRequest) {
  void request;
  try {
    const { user, role, supabase, unauthorized } = await requireUserWithRole([
      'admin',
      'marketer_full',
      'marketer_content',
    ]);
    if (unauthorized) return unauthorized;

    const data = await buildPromptConfigModule(supabase).getDefault(
      promptConfigActor(user.id, role)
    );
    return NextResponse.json({ data });
  } catch (error) {
    return promptConfigErrorResponse(error, '[GET Default Prompt Config Error]:');
  }
}
