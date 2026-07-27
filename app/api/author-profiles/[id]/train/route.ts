import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  AUTHOR_PROFILE_ROLES,
  authorProfileErrorResponse,
  buildAuthorProfileModule,
} from '../../_adapter';

export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, role, supabase, unauthorized } = await requireUserWithRole([...AUTHOR_PROFILE_ROLES]);
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const result = await buildAuthorProfileModule(supabase).collectStyleSamples(
      { userId: user.id, role }, id
    );
    return NextResponse.json(result);
  } catch (error) {
    return authorProfileErrorResponse(error, '[Author Profile Sample Collection Error]:');
  }
}
