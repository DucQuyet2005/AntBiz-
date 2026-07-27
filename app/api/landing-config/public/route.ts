import { NextResponse } from 'next/server';
import { createLandingConfigurationModule } from '@/backend/modules/landing-configuration/landing-configuration-factory';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await createLandingConfigurationModule(createClient())
      .readPublicConfiguration();
    return NextResponse.json(config);
  } catch {
    console.error('[Landing Configuration]', {
      operation: 'read public API',
      code: 'PUBLIC_READ_FAILED',
    });
    return NextResponse.json(
      { error: 'Không thể tải cấu hình Landing Page' },
      { status: 500 }
    );
  }
}
