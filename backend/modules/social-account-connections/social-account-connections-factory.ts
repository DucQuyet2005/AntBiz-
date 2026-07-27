import type { SupabaseClient } from '@supabase/supabase-js';
import {
  FacebookConnectionAdapter,
  type FacebookConnectionConfig,
} from './facebook-connection-adapter';
import { HmacOAuthStateProtector } from './hmac-oauth-state-protector';
import { SupabaseLinkedAccountRepository } from './linked-account-repository';
import { SocialAccountConnectionsModule } from './social-account-connections-module';
import {
  ThreadsConnectionAdapter,
  type ThreadsConnectionConfig,
} from './threads-connection-adapter';
import type { ConnectionIntent } from './social-account-connections-types';

export function createSocialAccountConnectionsModule(
  supabase: SupabaseClient,
  requestOrigin: string
) {
  return new SocialAccountConnectionsModule(
    new FacebookConnectionAdapter(fetch, () => facebookConfig(requestOrigin)),
    new ThreadsConnectionAdapter(fetch, () => threadsConfig(requestOrigin)),
    new SupabaseLinkedAccountRepository(supabase),
    new HmacOAuthStateProtector(secretForIntent)
  );
}

function facebookConfig(requestOrigin: string): FacebookConnectionConfig {
  return {
    appId: process.env.FB_APP_ID || '',
    appSecret: process.env.FB_APP_SECRET || '',
    redirectUri: process.env.FB_REDIRECT_URI
      || developmentCallback(requestOrigin, '/api/auth/facebook/callback'),
  };
}

function threadsConfig(requestOrigin: string): ThreadsConnectionConfig {
  return {
    appId: process.env.THREADS_APP_ID || '',
    appSecret: process.env.THREADS_APP_SECRET || '',
    redirectUri: process.env.THREADS_REDIRECT_URI
      || developmentCallback(requestOrigin, '/api/auth/threads/callback'),
  };
}

function developmentCallback(requestOrigin: string, path: string) {
  return process.env.NODE_ENV === 'production' ? '' : `${requestOrigin}${path}`;
}

function secretForIntent(intent: ConnectionIntent) {
  return intent === 'threads' ? process.env.THREADS_APP_SECRET : process.env.FB_APP_SECRET;
}
