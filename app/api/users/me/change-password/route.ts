import { NextResponse } from 'next/server';
import { createAccountSecurityModule } from '@/backend/modules/account-security/account-security-factory';
import {
  AccountSecurityError,
  AccountSecurityGatewayError,
} from '@/backend/modules/account-security/account-security-errors';
import { requireUser } from '@/lib/api/auth';

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user.email) {
    return NextResponse.json(
      { error: 'Tài khoản này không hỗ trợ đổi mật khẩu bằng email.' },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Nội dung yêu cầu không hợp lệ.' }, { status: 400 });
  }

  try {
    await createAccountSecurityModule(supabase).changePassword(
      { id: user.id, email: user.email },
      body
    );
    return NextResponse.json({
      success: true,
      message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
    });
  } catch (error) {
    if (error instanceof AccountSecurityError) {
      return NextResponse.json({ error: error.clientMessage }, { status: error.status });
    }
    if (error instanceof AccountSecurityGatewayError) {
      console.error('[AccountSecurity] Auth provider failure', {
        operation: error.operation,
        userId: user.id,
        error: error.cause,
      });
    } else {
      console.error('[AccountSecurity] Unexpected failure', { userId: user.id, error });
    }
    return NextResponse.json({ error: 'Không thể đổi mật khẩu. Vui lòng thử lại sau.' }, {
      status: 500,
    });
  }
}
