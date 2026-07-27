import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { SocialAccountConnectionsError } from './social-account-connections-errors';
import type {
  ConnectionIntent,
  OAuthStateProtector,
  VerifiedOAuthState,
} from './social-account-connections-types';

const STATE_VERSION = 1;
const STATE_TTL_SECONDS = 10 * 60;
const MAX_FUTURE_SKEW_SECONDS = 60;

type SecretProvider = (intent: ConnectionIntent) => string | undefined;
type Clock = () => number;
type NonceProvider = () => string;

interface StatePayload {
  v: number;
  intent: ConnectionIntent;
  userId: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
}

export class HmacOAuthStateProtector implements OAuthStateProtector {
  constructor(
    private readonly secretProvider: SecretProvider,
    private readonly clock: Clock = () => Date.now(),
    private readonly nonceProvider: NonceProvider = () => randomBytes(32).toString('base64url')
  ) {}

  create(intent: ConnectionIntent, userId: string) {
    const secret = this.requireSecret(intent);
    const issuedAt = Math.floor(this.clock() / 1000);
    const payload: StatePayload = {
      v: STATE_VERSION,
      intent,
      userId,
      nonce: this.nonceProvider(),
      issuedAt,
      expiresAt: issuedAt + STATE_TTL_SECONDS,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return {
      state: `${encodedPayload}.${sign(encodedPayload, secret)}`,
      nonce: payload.nonce,
      expiresAt: payload.expiresAt,
    };
  }

  verify(state: string, userId: string, nonce: string): VerifiedOAuthState {
    try {
      const [encodedPayload, receivedSignature, extra] = state.split('.');
      if (!encodedPayload || !receivedSignature || extra !== undefined) throw invalidState();

      const payload = parsePayload(encodedPayload);
      const secret = this.requireSecret(payload.intent);
      const expectedSignature = sign(encodedPayload, secret);
      const expectedBuffer = Buffer.from(expectedSignature);
      const receivedBuffer = Buffer.from(receivedSignature);
      if (
        expectedBuffer.length !== receivedBuffer.length
        || !timingSafeEqual(expectedBuffer, receivedBuffer)
      ) {
        throw invalidState();
      }

      const now = Math.floor(this.clock() / 1000);
      if (
        payload.expiresAt < now
        || payload.issuedAt > now + MAX_FUTURE_SKEW_SECONDS
        || payload.expiresAt - payload.issuedAt !== STATE_TTL_SECONDS
        || payload.userId !== userId
        || payload.nonce !== nonce
      ) {
        throw invalidState();
      }
      return payload;
    } catch (error) {
      if (error instanceof SocialAccountConnectionsError) throw error;
      throw invalidState();
    }
  }

  private requireSecret(intent: ConnectionIntent) {
    const secret = this.secretProvider(intent)?.trim();
    if (!secret) {
      throw new SocialAccountConnectionsError(
        'configuration_error',
        500,
        'Kết nối mạng xã hội chưa được cấu hình'
      );
    }
    return secret;
  }
}

function sign(encodedPayload: string, secret: string) {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function parsePayload(encodedPayload: string): StatePayload {
  const value = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as unknown;
  if (!isStatePayload(value)) throw invalidState();
  return value;
}

function isStatePayload(value: unknown): value is StatePayload {
  if (typeof value !== 'object' || value === null) return false;
  const payload = value as Partial<StatePayload>;
  return payload.v === STATE_VERSION
    && (payload.intent === 'facebook' || payload.intent === 'instagram' || payload.intent === 'threads')
    && typeof payload.userId === 'string'
    && payload.userId.length > 0
    && typeof payload.nonce === 'string'
    && payload.nonce.length > 0
    && Number.isInteger(payload.issuedAt)
    && Number.isInteger(payload.expiresAt);
}

function invalidState() {
  return new SocialAccountConnectionsError(
    'invalid_state',
    400,
    'Phiên liên kết không hợp lệ hoặc đã hết hạn'
  );
}
