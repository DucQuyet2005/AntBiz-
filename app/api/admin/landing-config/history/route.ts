import { NextResponse } from 'next/server';
import {
  createLandingConfigurationModule,
  landingConfigurationErrorResponse,
  readLandingConfigurationJson,
  requireLandingConfigurationAdmin,
} from '../_adapter';

export async function GET() {
  const { supabase, unauthorized } = await requireLandingConfigurationAdmin();
  if (unauthorized) return unauthorized;

  try {
    const history = await createLandingConfigurationModule(supabase).listHistory();
    return NextResponse.json(history);
  } catch (error) {
    return landingConfigurationErrorResponse(error, 'list history');
  }
}

export async function DELETE(request: Request) {
  const { supabase, unauthorized } = await requireLandingConfigurationAdmin();
  if (unauthorized) return unauthorized;

  try {
    const id = new URL(request.url).searchParams.get('id');
    const result = await createLandingConfigurationModule(supabase).deleteHistory(id);
    return NextResponse.json(result);
  } catch (error) {
    return landingConfigurationErrorResponse(error, 'delete history');
  }
}

export async function PATCH(request: Request) {
  const { supabase, unauthorized } = await requireLandingConfigurationAdmin();
  if (unauthorized) return unauthorized;

  try {
    const input = await readLandingConfigurationJson(request);
    const result = await createLandingConfigurationModule(supabase).updateHistoryNote(input);
    return NextResponse.json(result);
  } catch (error) {
    return landingConfigurationErrorResponse(error, 'update history note');
  }
}
