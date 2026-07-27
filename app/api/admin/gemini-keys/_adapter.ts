import { NextResponse } from 'next/server';
import { GeminiCapacityError } from '@/backend/modules/gemini-capacity/errors';
import { createAdminGeminiCapacityModule } from '@/backend/modules/gemini-capacity/gemini-capacity-factory';
import { requireUserWithRole } from '@/lib/api/auth';

export { createAdminGeminiCapacityModule };

export function requireGeminiCapacityAdmin() {
  return requireUserWithRole(['admin']);
}

export async function readGeminiCapacityJson(request: Request) {
  try {
    return await request.json() as unknown;
  } catch {
    throw new GeminiCapacityError('INVALID_INPUT', 'Nội dung JSON không hợp lệ');
  }
}

export function geminiCapacityErrorResponse(error: unknown, operation: string) {
  if (error instanceof GeminiCapacityError) {
    console.error('[Gemini Capacity]', { operation, code: error.code, context: error.context });
    const status = error.code === 'INVALID_INPUT' || error.code === 'DUPLICATE_KEY'
      ? 400
      : error.code === 'KEY_NOT_FOUND'
        ? 404
        : 500;
    return NextResponse.json({ error: error.clientMessage }, { status });
  }

  console.error('[Gemini Capacity]', { operation, code: 'UNEXPECTED_ERROR' });
  return NextResponse.json({ error: 'Không thể quản lý Gemini API Key' }, { status: 500 });
}
