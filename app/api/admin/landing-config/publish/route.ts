import type { SupabaseClient, User } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import type { LandingConfigurationPublishResult } from '@/backend/modules/landing-configuration/landing-configuration-types';
import { createNotifications } from '@/lib/services/notificationService';
import {
  createLandingConfigurationModule,
  landingConfigurationErrorResponse,
  readLandingConfigurationJson,
  requireLandingConfigurationAdmin,
} from '../_adapter';

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireLandingConfigurationAdmin();
  if (unauthorized || !user) return unauthorized;

  try {
    const input = await readLandingConfigurationJson(request, {});
    const result = await createLandingConfigurationModule(supabase).publish(user.id, input);

    revalidatePath('/');
    await notifyAdministratorsBestEffort(supabase, user, result);

    return NextResponse.json({ success: true, history: result.history });
  } catch (error) {
    return landingConfigurationErrorResponse(error, 'publish');
  }
}

async function notifyAdministratorsBestEffort(
  supabase: SupabaseClient,
  actor: User,
  result: LandingConfigurationPublishResult
) {
  try {
    const { data: administrators, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');
    if (error) throw error;
    if (!administrators?.length) return;

    await createNotifications(administrators.map((administrator) => ({
      userId: administrator.id,
      type: 'info' as const,
      title: 'Landing Page đã được xuất bản',
      message: `Admin ${actor.email || 'hệ thống'} đã xuất bản Landing Page với ghi chú: "${result.note}".`,
      metadata: {
        history_id: result.history?.id ?? null,
        action_by: actor.id,
        note: result.note,
      },
    })));
  } catch {
    console.error('[Landing Configuration]', {
      operation: 'publish notification',
      code: 'NOTIFICATION_FAILED',
    });
  }
}
