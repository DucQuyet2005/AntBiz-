import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { buildPromptModule, promptActor, promptErrorResponse } from '../_adapter';

export async function GET(request: NextRequest) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole([
    'admin',
    'marketer_full',
    'marketer_content',
  ]);
  if (unauthorized) return unauthorized;

  const platform = request.nextUrl.searchParams.get('platform');
  if (!platform) {
    return NextResponse.json({ error: 'Thiếu platform cần lấy default prompt' }, { status: 400 });
  }

  try {
    const data = await buildPromptModule(supabase).getDefault(promptActor(user.id, role), platform);
    return NextResponse.json({ data });
  } catch (error) {
    return promptErrorResponse(error, '[GET /api/prompts/default] error:');
  }
}
