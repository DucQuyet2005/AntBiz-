import { NextRequest, NextResponse } from 'next/server';
import {
  createPlatformPresetSchema,
  platformPresetPlatformSchema,
} from '@/backend/modules/platform-presets/platform-preset-schemas';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildPlatformPresetModule,
  platformPresetActor,
  platformPresetErrorResponse,
} from './_adapter';

const PLATFORM_PRESET_ROLES = ['admin', 'marketer_full', 'marketer_content'] as const;

export async function GET(request: NextRequest) {
  try {
    const { user, role, supabase, unauthorized } = await requireUserWithRole([
      ...PLATFORM_PRESET_ROLES,
    ]);
    if (unauthorized) return unauthorized;

    const platformParam = request.nextUrl.searchParams.get('platform');
    if (!platformParam) {
      return NextResponse.json({ error: 'Thiếu tham số platform' }, { status: 400 });
    }

    const parsed = platformPresetPlatformSchema.safeParse(platformParam);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Nền tảng không hợp lệ' },
        { status: 400 }
      );
    }

    const data = await buildPlatformPresetModule(supabase).list(
      platformPresetActor(user.id, role),
      parsed.data
    );
    return NextResponse.json({ data });
  } catch (error) {
    return platformPresetErrorResponse(error, '[GET Platform Presets Error]:');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, supabase, unauthorized } = await requireUserWithRole([
      ...PLATFORM_PRESET_ROLES,
    ]);
    if (unauthorized) return unauthorized;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 });
    }

    const parsed = createPlatformPresetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const data = await buildPlatformPresetModule(supabase).create(
      platformPresetActor(user.id, role),
      parsed.data
    );
    return NextResponse.json({ data });
  } catch (error) {
    return platformPresetErrorResponse(error, '[POST Platform Presets Error]:');
  }
}
