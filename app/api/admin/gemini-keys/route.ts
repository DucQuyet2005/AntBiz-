import { NextResponse } from 'next/server';
import {
  createAdminGeminiCapacityModule,
  geminiCapacityErrorResponse,
  readGeminiCapacityJson,
  requireGeminiCapacityAdmin,
} from './_adapter';

export async function GET() {
  const { supabase, unauthorized } = await requireGeminiCapacityAdmin();
  if (unauthorized) return unauthorized;

  try {
    const data = await createAdminGeminiCapacityModule(supabase).listKeys();
    return NextResponse.json({ data });
  } catch (error) {
    return geminiCapacityErrorResponse(error, 'list keys');
  }
}

export async function POST(request: Request) {
  const { supabase, unauthorized } = await requireGeminiCapacityAdmin();
  if (unauthorized) return unauthorized;

  try {
    const input = await readGeminiCapacityJson(request);
    const data = await createAdminGeminiCapacityModule(supabase).createKey(input);
    return NextResponse.json({ data });
  } catch (error) {
    return geminiCapacityErrorResponse(error, 'create key');
  }
}
