import { NextRequest, NextResponse } from 'next/server';
import { updateAuthorProfileSchema } from '@/backend/modules/author-profiles/author-profile-schemas';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  AUTHOR_PROFILE_ROLES,
  authorProfileErrorResponse,
  buildAuthorProfileModule,
} from '../_adapter';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { user, role, supabase, unauthorized } = await requireUserWithRole([...AUTHOR_PROFILE_ROLES]);
    if (unauthorized) return unauthorized;
    const { id } = await params;
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 }); }
    const parsed = updateAuthorProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }
    const data = await buildAuthorProfileModule(supabase).update(
      { userId: user.id, role }, id, parsed.data
    );
    return NextResponse.json({ data });
  } catch (error) {
    return authorProfileErrorResponse(error, '[PUT Author Profile Error]:');
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { user, role, supabase, unauthorized } = await requireUserWithRole([...AUTHOR_PROFILE_ROLES]);
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const data = await buildAuthorProfileModule(supabase).delete({ userId: user.id, role }, id);
    return NextResponse.json({ data });
  } catch (error) {
    return authorProfileErrorResponse(error, '[DELETE Author Profile Error]:');
  }
}
