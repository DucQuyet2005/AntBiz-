import { NextResponse } from 'next/server';
import { LandingConfigurationModuleError } from '@/backend/modules/landing-configuration/errors';
import { createLandingConfigurationModule } from '@/backend/modules/landing-configuration/landing-configuration-factory';
import { requireUserWithRole } from '@/lib/api/auth';

export { createLandingConfigurationModule };

export function requireLandingConfigurationAdmin() {
  return requireUserWithRole(['admin']);
}

export async function readLandingConfigurationJson(
  request: Request,
  fallback?: unknown
): Promise<unknown> {
  const body = await request.text();
  if (!body.trim()) return fallback;

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new LandingConfigurationModuleError(
      'INVALID_INPUT',
      'Nội dung JSON không hợp lệ'
    );
  }
}

export function landingConfigurationErrorResponse(error: unknown, operation: string) {
  if (error instanceof LandingConfigurationModuleError) {
    console.error('[Landing Configuration]', {
      operation,
      code: error.code,
      context: error.context,
    });

    const status = error.code === 'INVALID_INPUT' || error.code === 'DUPLICATE_CONFIGURATION'
      ? 400
      : error.code === 'CONFIGURATION_NOT_FOUND'
        ? 404
        : error.code === 'FORBIDDEN'
          ? 403
          : 500;
    return NextResponse.json({ error: error.clientMessage }, { status });
  }

  console.error('[Landing Configuration]', { operation, code: 'UNEXPECTED_ERROR' });
  return NextResponse.json({ error: 'Không thể xử lý cấu hình Landing Page' }, { status: 500 });
}
