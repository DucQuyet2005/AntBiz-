import { NextResponse } from 'next/server';
import {
  createLandingConfigurationModule,
  landingConfigurationErrorResponse,
  readLandingConfigurationJson,
  requireLandingConfigurationAdmin,
} from './_adapter';

export async function GET() {
  const { supabase, unauthorized } = await requireLandingConfigurationAdmin();
  if (unauthorized) return unauthorized;

  try {
    const data = await createLandingConfigurationModule(supabase).list();
    return NextResponse.json(data);
  } catch (error) {
    return landingConfigurationErrorResponse(error, 'list');
  }
}

export async function PUT(request: Request) {
  const { supabase, user, unauthorized } = await requireLandingConfigurationAdmin();
  if (unauthorized || !user) return unauthorized;

  try {
    const input = await readLandingConfigurationJson(request);
    const result = await createLandingConfigurationModule(supabase).set(user.id, input);
    return NextResponse.json(result);
  } catch (error) {
    return landingConfigurationErrorResponse(error, 'set');
  }
}

export async function DELETE() {
  const { supabase, unauthorized } = await requireLandingConfigurationAdmin();
  if (unauthorized) return unauthorized;

  try {
    await createLandingConfigurationModule(supabase).clear();
    return NextResponse.json({
      success: true,
      message: 'All custom configuration cleared successfully',
    });
  } catch (error) {
    return landingConfigurationErrorResponse(error, 'clear');
  }
}
