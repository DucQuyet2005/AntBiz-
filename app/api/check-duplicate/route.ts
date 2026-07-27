import { NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { checkDuplicateCaption } from '@/backend/modules/caption-generation/duplicate-checking';

export async function POST(req: Request) {
  try {
    const { user, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
    if (unauthorized) return unauthorized;

    const body = await req.json();
    const { text, threshold = 0.75 } = body;

    const result = await checkDuplicateCaption(supabase, user.id, text, threshold);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[API Check Duplicate] Exception:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
