import { NextRequest, NextResponse } from 'next/server';
import {
  createAuthorProfileSchema,
} from '@/backend/modules/author-profiles/author-profile-schemas';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  AUTHOR_PROFILE_ROLES,
  authorProfileErrorResponse,
  buildAuthorProfileModule,
} from './_adapter';

export async function GET() {
  try {
    const { user, role, supabase, unauthorized } = await requireUserWithRole([...AUTHOR_PROFILE_ROLES]);
    if (unauthorized) return unauthorized;
    const data = await buildAuthorProfileModule(supabase).list({ userId: user.id, role });
    return NextResponse.json({ data });
  } catch (error) {
    return authorProfileErrorResponse(error, '[GET Author Profiles Error]:');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, supabase, unauthorized } = await requireUserWithRole([...AUTHOR_PROFILE_ROLES]);
    if (unauthorized) return unauthorized;
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 }); }
    const parsed = createAuthorProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }
    const data = await buildAuthorProfileModule(supabase).create(
      { userId: user.id, role }, parsed.data
    );
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return authorProfileErrorResponse(error, '[POST Author Profile Error]:');
  }
}
