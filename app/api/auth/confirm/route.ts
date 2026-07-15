import { NextRequest, NextResponse } from 'next/server';
import { createPasswordRecoveryModule } from '@/backend/modules/account-security/password-recovery-factory';
import { resolvePasswordRecoveryOrigin } from '@/backend/modules/account-security/password-recovery-origin';
import { createClient } from '@/utils/supabase/server';

const INVALID_LINK_MESSAGE = 'Link xác thực không hợp lệ hoặc đã hết hạn.';

export async function GET(request: NextRequest) {
  let origin: string;
  try {
    origin = resolvePasswordRecoveryOrigin(process.env.NEXT_PUBLIC_SITE_URL, request.url);
  } catch {
    const fallback = new URL('/login', request.url);
    fallback.searchParams.set('error', INVALID_LINK_MESSAGE);
    return NextResponse.redirect(fallback);
  }

  const token = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  let confirmed = false;
  try {
    confirmed = await createPasswordRecoveryModule(createClient())
      .confirmRecovery(token, type);
  } catch {
    confirmed = false;
  }

  if (confirmed) return NextResponse.redirect(new URL('/reset-password', origin));
  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set('error', INVALID_LINK_MESSAGE);
  return NextResponse.redirect(loginUrl);
}
