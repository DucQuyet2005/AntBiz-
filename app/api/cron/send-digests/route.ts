import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createNotificationModule } from '@/backend/modules/notifications/notification-factory';
import { sendEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  // 1. Verify authorization secret
  const authHeader = request.headers.get('authorization');
  const secretParam = request.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET || 'antbiz_cron_secret_abc123';

  const isAuthorized =
    authHeader === `Bearer ${cronSecret}` ||
    secretParam === cronSecret;

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const notificationModule = createNotificationModule(supabase);

    // 2. Get current hour in Vietnam timezone (GMT+7)
    const now = new Date();
    // Convert to GMT+7 timezone explicitly
    const gmt7Time = new Date(now.getTime() + (7 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    const hours = String(gmt7Time.getHours()).padStart(2, '0');
    
    // Allow overriding hour via URL query parameter for testing purposes (e.g., ?hour=20:00)
    const overrideHour = request.nextUrl.searchParams.get('hour');
    const currentHour = overrideHour || `${hours}:00`;

    console.log(`[Cron Send Digests] Running cron at local time: ${gmt7Time.toISOString()} for schedule hour: ${currentHour}`);

    // 3. Process digests using module (bypass duplicate prevention if force=true)
    const forceBypass = request.nextUrl.searchParams.get('force') === 'true';
    const result = await notificationModule.processDailyDigests(currentHour, sendEmail, forceBypass);

    return NextResponse.json({
      success: true,
      hour: currentHour,
      ...result
    });
  } catch (error: any) {
    console.error('[Cron Send Digests] Execution failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Lỗi xử lý gửi email tổng hợp'
    }, { status: 500 });
  }
}
