import { NextResponse } from 'next/server';
import {
  createAdminGeminiCapacityModule,
  geminiCapacityErrorResponse,
  readGeminiCapacityJson,
  requireGeminiCapacityAdmin,
} from '../_adapter';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, unauthorized } = await requireGeminiCapacityAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const input = await readGeminiCapacityJson(request);
    const data = await createAdminGeminiCapacityModule(supabase).updateKey(id, input);
    return NextResponse.json({ data });
  } catch (error) {
    return geminiCapacityErrorResponse(error, 'update key');
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, unauthorized } = await requireGeminiCapacityAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const result = await createAdminGeminiCapacityModule(supabase).deleteKey(id);
    return NextResponse.json(result);
  } catch (error) {
    return geminiCapacityErrorResponse(error, 'delete key');
  }
}
