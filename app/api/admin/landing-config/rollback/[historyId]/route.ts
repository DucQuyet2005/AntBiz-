import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import {
  createLandingConfigurationModule,
  landingConfigurationErrorResponse,
  requireLandingConfigurationAdmin,
} from '../../_adapter';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ historyId: string }> }
) {
  const { supabase, unauthorized } = await requireLandingConfigurationAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { historyId } = await params;
    await createLandingConfigurationModule(supabase).rollback(historyId);
    revalidatePath('/');
    return NextResponse.json({ success: true, message: 'Rollback successful' });
  } catch (error) {
    return landingConfigurationErrorResponse(error, 'rollback');
  }
}
