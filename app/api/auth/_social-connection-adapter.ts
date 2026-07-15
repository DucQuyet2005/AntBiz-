import type { SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  createSocialAccountConnectionsModule,
  peekOAuthStateIntent,
  SocialAccountConnectionsError,
  type ConnectionIntent,
  type ConnectionProvider,
  type SocialAccountConnectionsModuleInterface,
} from '@/backend/modules/social-account-connections';

export const SOCIAL_CONNECTION_ROLES = [
  'admin',
  'marketer_full',
  'marketer_content',
] satisfies ('admin' | 'marketer_full' | 'marketer_content')[];

const COOKIE_MAX_AGE_SECONDS = 10 * 60;

export function buildSocialAccountConnectionsModule(
  supabase: SupabaseClient,
  requestOrigin: string
) {
  return createSocialAccountConnectionsModule(supabase, requestOrigin);
}

export function beginSocialConnectionResponse(
  module: SocialAccountConnectionsModuleInterface,
  intent: ConnectionIntent,
  userId: string
) {
  try {
    const result = module.begin(intent, userId);
    const response = NextResponse.redirect(result.authorizationUrl);
    response.cookies.set(oauthNonceCookieName(intent), result.nonce, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE_SECONDS,
      path: callbackPath(intent),
    });
    return response;
  } catch (error) {
    return socialConnectionJsonErrorResponse(error);
  }
}

export async function completeSocialConnectionResponse(
  module: SocialAccountConnectionsModuleInterface,
  provider: ConnectionProvider,
  request: NextRequest,
  userId: string
) {
  const state = request.nextUrl.searchParams.get('state') || '';
  const intent = peekOAuthStateIntent(state);
  const nonce = intent ? request.cookies.get(oauthNonceCookieName(intent))?.value || '' : '';
  const settingsOrigin = resolveTrustedSettingsOrigin(request);
  if (!settingsOrigin) {
    const response = NextResponse.json(
      { error: 'Kết nối mạng xã hội chưa được cấu hình' },
      { status: 500 }
    );
    clearProviderNonceCookies(response, provider, intent);
    return response;
  }

  let response: NextResponse;
  try {
    const result = await module.complete({
      provider,
      code: request.nextUrl.searchParams.get('code') || '',
      state,
      nonce,
      userId,
    });
    response = NextResponse.redirect(settingsRedirect(settingsOrigin, result.intent, 'success'));
  } catch (error) {
    const code = error instanceof SocialAccountConnectionsError
      ? error.code
      : 'connection_failed';
    const platform = intent || (provider === 'threads' ? 'threads' : 'facebook');
    logSocialConnectionFailure(error, provider);
    response = NextResponse.redirect(settingsRedirect(settingsOrigin, platform, 'failed', code));
  }

  clearProviderNonceCookies(response, provider, intent);
  return response;
}

export function socialConnectionJsonErrorResponse(error: unknown) {
  if (error instanceof SocialAccountConnectionsError) {
    if (error.status >= 500) logSocialConnectionFailure(error);
    return NextResponse.json({ error: error.clientMessage }, { status: error.status });
  }
  logSocialConnectionFailure(error);
  return NextResponse.json({ error: 'Lỗi hệ thống khi xử lý tài khoản liên kết' }, { status: 500 });
}

export function oauthNonceCookieName(intent: ConnectionIntent) {
  return `antbiz_social_oauth_${intent}`;
}

function callbackPath(intent: ConnectionIntent) {
  return intent === 'threads'
    ? '/api/auth/threads/callback'
    : '/api/auth/facebook/callback';
}

function clearProviderNonceCookies(
  response: NextResponse,
  provider: ConnectionProvider,
  intent?: ConnectionIntent
) {
  const intentMatchesProvider = intent
    && (provider === 'threads' ? intent === 'threads' : intent !== 'threads');
  const intents: ConnectionIntent[] = intentMatchesProvider
    ? [intent]
    : provider === 'threads'
      ? ['threads']
      : ['facebook', 'instagram'];
  for (const intent of intents) {
    response.cookies.set(oauthNonceCookieName(intent), '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: callbackPath(intent),
    });
  }
}

function settingsRedirect(
  origin: string,
  platform: ConnectionIntent,
  connected: 'success' | 'failed',
  error?: string
) {
  const url = new URL('/settings', origin);
  url.searchParams.set('connected', connected);
  url.searchParams.set('platform', platform);
  if (error) url.searchParams.set('error', error);
  return url;
}

function resolveTrustedSettingsOrigin(request: NextRequest) {
  const configured = parseHttpOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;
  return process.env.NODE_ENV === 'production' ? undefined : request.nextUrl.origin;
}

function parseHttpOrigin(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

function logSocialConnectionFailure(error: unknown, provider?: ConnectionProvider) {
  if (error instanceof SocialAccountConnectionsError) {
    console.error('[Social Account Connections] operation failed', {
      code: error.code,
      status: error.status,
      provider,
      ...error.context,
    });
    return;
  }
  console.error('[Social Account Connections] unexpected failure', { provider });
}
