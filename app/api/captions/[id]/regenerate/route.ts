import { NextRequest, NextResponse } from 'next/server';
import { regenerateCaptionSchema } from '@/backend/modules/caption-management/caption-management-schemas';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildCaptionRegenerationModule,
  captionManagementActor,
  captionManagementErrorResponse,
} from '../../_regeneration-adapter';

const CAPTION_ROLES = ['admin', 'marketer_full', 'marketer_content'] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, role, supabase, unauthorized } = await requireUserWithRole([
      ...CAPTION_ROLES,
    ]);
    if (unauthorized) return unauthorized;

    let body: unknown;
    try { body = await request.json(); }
    catch {
      return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 });
    }
    const parsed = regenerateCaptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const data = await buildCaptionRegenerationModule(supabase).regenerate(
      captionManagementActor(user.id, role),
      id,
      parsed.data
    );
    return NextResponse.json({ data });
  } catch (error) {
    return captionManagementErrorResponse(
      error,
      '[POST /api/captions/[id]/regenerate] error:'
    );
  }
}
