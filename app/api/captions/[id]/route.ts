import { NextRequest, NextResponse } from 'next/server';
import { updateCaptionSchema } from '@/backend/modules/caption-management/caption-management-schemas';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildCaptionManagementModule,
  captionManagementActor,
  captionManagementErrorResponse,
} from '../_management-adapter';

type RouteParams = { params: Promise<{ id: string }> };
const CAPTION_ROLES = ['admin', 'marketer_full', 'marketer_content'] as const;

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, role, supabase, unauthorized } = await requireUserWithRole([...CAPTION_ROLES]);
    if (unauthorized) return unauthorized;
    const data = await buildCaptionManagementModule(supabase).get(
      captionManagementActor(user.id, role), id
    );
    return NextResponse.json({ data });
  } catch (error) {
    return captionManagementErrorResponse(error, '[GET /api/captions/[id]] error:');
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, role, supabase, unauthorized } = await requireUserWithRole([...CAPTION_ROLES]);
    if (unauthorized) return unauthorized;
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 }); }
    const parsed = updateCaptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = await buildCaptionManagementModule(supabase).update(
      captionManagementActor(user.id, role), id, parsed.data
    );
    return NextResponse.json({ data });
  } catch (error) {
    return captionManagementErrorResponse(error, '[PUT /api/captions/[id]] error:');
  }
}
