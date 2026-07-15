import { NextResponse } from 'next/server';
import { createPasswordRecoveryModule } from '@/backend/modules/account-security/password-recovery-factory';
import {
  PasswordRecoveryError,
  PasswordRecoveryGatewayError,
} from '@/backend/modules/account-security/password-recovery-errors';
import { requireUser } from '@/lib/api/auth';

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  }

  try {
    await createPasswordRecoveryModule(supabase).resetPassword(body);
    return NextResponse.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công. Tất cả các phiên đăng nhập khác đã được thu hồi.',
    });
  } catch (error) {
    if (error instanceof PasswordRecoveryError) {
      return NextResponse.json({ error: error.clientMessage }, { status: error.status });
    }
    if (error instanceof PasswordRecoveryGatewayError) {
      console.error('[PasswordRecovery] Provider operation failed', {
        operation: error.operation,
        userId: user.id,
      });
    } else {
      console.error('[PasswordRecovery] Unexpected reset failure', { userId: user.id });
    }
    return NextResponse.json({ error: 'Không thể đặt lại mật khẩu. Vui lòng thử lại sau.' }, {
      status: 500,
    });
  }
}
