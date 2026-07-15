import { NextResponse } from 'next/server';
import { createPasswordRecoveryModule } from '@/backend/modules/account-security/password-recovery-factory';
import {
  PasswordRecoveryError,
  PasswordRecoveryOriginError,
} from '@/backend/modules/account-security/password-recovery-errors';
import { resolvePasswordRecoveryOrigin } from '@/backend/modules/account-security/password-recovery-origin';
import { createClient } from '@/utils/supabase/server';

const ACCEPTED_MESSAGE =
  'Nếu tài khoản tồn tại trên hệ thống, email hướng dẫn đặt lại mật khẩu đã được gửi đi.';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Email không hợp lệ.' }, { status: 400 });
  }

  try {
    const origin = resolvePasswordRecoveryOrigin(
      process.env.NEXT_PUBLIC_SITE_URL,
      request.url
    );
    await createPasswordRecoveryModule(createClient()).requestRecovery(body, origin);
    return NextResponse.json({ message: ACCEPTED_MESSAGE });
  } catch (error) {
    if (error instanceof PasswordRecoveryError) {
      return NextResponse.json({ error: error.clientMessage }, { status: error.status });
    }
    if (error instanceof PasswordRecoveryOriginError) {
      console.error('[PasswordRecovery] Trusted origin unavailable');
    } else {
      console.error('[PasswordRecovery] Unexpected request failure');
    }
    return NextResponse.json({ error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.' }, {
      status: 500,
    });
  }
}
