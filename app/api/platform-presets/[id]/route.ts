import { NextRequest, NextResponse } from 'next/server';
import { updatePlatformPresetSchema } from '@/backend/modules/platform-presets/platform-preset-schemas';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildPlatformPresetModule,
  platformPresetActor,
  platformPresetErrorResponse,
} from '../_adapter';

import { createAdminClient } from '@/utils/supabase/admin';

type RouteParams = { params: Promise<{ id: string }> };
const PLATFORM_PRESET_ROLES = ['admin', 'marketer_full', 'marketer_content'] as const;

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    const parsed = updatePlatformPresetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const client = role === 'admin' ? createAdminClient() : supabase;
    const data = await buildPlatformPresetModule(client).update(
      platformPresetActor(user.id, role),
      id,
      parsed.data
    );
    return NextResponse.json({ data });
  } catch (error) {
    return platformPresetErrorResponse(error, '[PUT Platform Preset Error]:');
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, role, supabase, unauthorized } = await requireUserWithRole([
      ...PLATFORM_PRESET_ROLES,
    ]);
    if (unauthorized) return unauthorized;

    const client = role === 'admin' ? createAdminClient() : supabase;
    const result = await buildPlatformPresetModule(client).delete(
      platformPresetActor(user.id, role),
      id
    );
    return NextResponse.json(result);
  } catch (error) {
    return platformPresetErrorResponse(error, '[DELETE Platform Preset Error]:');
  }
}
