import { SocialAccountConnectionsError } from './social-account-connections-errors';
import type {
  ConnectionIntent,
  ConnectionPlatform,
  StoredConnectionPlatform,
} from './social-account-connections-types';

const CONNECTION_INTENTS = new Set<ConnectionIntent>(['facebook', 'instagram', 'threads']);

export function parseConnectionIntent(value: unknown): ConnectionIntent {
  if (typeof value === 'string' && CONNECTION_INTENTS.has(value as ConnectionIntent)) {
    return value as ConnectionIntent;
  }
  throw invalidPlatform();
}

export function parseDisconnectPlatform(value: unknown): StoredConnectionPlatform {
  if (value === 'threads' || value === 'thread') return 'thread';
  if (value === 'facebook' || value === 'instagram') return value;
  throw invalidPlatform();
}

export function toStoredPlatform(platform: ConnectionPlatform): StoredConnectionPlatform {
  return platform === 'threads' ? 'thread' : platform;
}

export function peekOAuthStateIntent(state: string): ConnectionIntent | undefined {
  try {
    const [encodedPayload] = state.split('.');
    const value = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as unknown;
    if (typeof value !== 'object' || value === null) return undefined;
    const intent = (value as { intent?: unknown }).intent;
    return typeof intent === 'string' && CONNECTION_INTENTS.has(intent as ConnectionIntent)
      ? intent as ConnectionIntent
      : undefined;
  } catch {
    return undefined;
  }
}

function invalidPlatform() {
  return new SocialAccountConnectionsError(
    'invalid_platform',
    400,
    'Nền tảng liên kết không hợp lệ'
  );
}
