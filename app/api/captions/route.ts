import { NextRequest, NextResponse } from 'next/server';
import {
  createCaptionSchema,
  listCaptionsSchema,
} from '@/backend/modules/caption-management/caption-management-schemas';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildCaptionManagementModule,
  captionManagementActor,
  captionManagementErrorResponse,
} from './_management-adapter';

const CAPTION_ROLES = ['admin', 'marketer_full', 'marketer_content'] as const;

export async function POST(request: NextRequest) {
  try {
    const { user, role, supabase, unauthorized } = await requireUserWithRole([...CAPTION_ROLES]);
    if (unauthorized) return unauthorized;
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 }); }
    const parsed = createCaptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = await buildCaptionManagementModule(supabase).create(
      captionManagementActor(user.id, role), parsed.data
    );
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return captionManagementErrorResponse(error, '[POST /api/captions] error:');
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, role, supabase, unauthorized } = await requireUserWithRole([...CAPTION_ROLES]);
    if (unauthorized) return unauthorized;
    const parsed = listCaptionsSchema.safeParse({
      platform: request.nextUrl.searchParams.get('platform') || undefined,
      search: request.nextUrl.searchParams.get('search') || undefined,
      page: request.nextUrl.searchParams.get('page') || undefined,
      limit: request.nextUrl.searchParams.get('limit') || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }
    const result = await buildCaptionManagementModule(supabase).list(
      captionManagementActor(user.id, role), parsed.data
    );
    return NextResponse.json(result);
  } catch (error) {
    return captionManagementErrorResponse(error, '[GET /api/captions] error:');
  }
}
