export type ConnectionIntent = 'facebook' | 'instagram' | 'threads';
export type ConnectionProvider = 'facebook' | 'threads';
export type ConnectionPlatform = 'facebook' | 'instagram' | 'threads';
export type StoredConnectionPlatform = 'facebook' | 'instagram' | 'thread';

export interface LinkedAccountCandidate {
  platform: ConnectionPlatform;
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
}

export interface LinkedAccountPublicRecord {
  id: string;
  platform: StoredConnectionPlatform;
  account_id: string;
  account_name?: string | null;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ConnectionDiscoveryResult {
  candidates: LinkedAccountCandidate[];
  discoveryFailures: number;
}

export interface BeginConnectionResult {
  authorizationUrl: string;
  intent: ConnectionIntent;
  nonce: string;
  expiresAt: number;
}

export interface CompleteConnectionInput {
  provider: ConnectionProvider;
  code: string;
  state: string;
  nonce: string;
  userId: string;
}

export interface CompleteConnectionResult {
  intent: ConnectionIntent;
  discovered: number;
  persisted: number;
  failed: number;
}

export interface VerifiedOAuthState {
  intent: ConnectionIntent;
  userId: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
}

export interface OAuthStateProtector {
  create(intent: ConnectionIntent, userId: string): {
    state: string;
    nonce: string;
    expiresAt: number;
  };
  verify(state: string, userId: string, nonce: string): VerifiedOAuthState;
}

export interface FacebookConnectionProvider {
  buildAuthorizationUrl(state: string): string;
  discoverAccounts(code: string): Promise<ConnectionDiscoveryResult>;
}

export interface ThreadsConnectionProvider {
  buildAuthorizationUrl(state: string): string;
  discoverAccount(code: string): Promise<LinkedAccountCandidate>;
}

export interface LinkedAccountRepository {
  list(userId: string): Promise<LinkedAccountPublicRecord[]>;
  upsert(userId: string, candidate: LinkedAccountCandidate): Promise<boolean>;
  disconnect(userId: string, platform: StoredConnectionPlatform): Promise<void>;
}

export interface SocialAccountConnectionsLogger {
  connectionEvaluated(context: {
    provider: ConnectionProvider;
    intent: ConnectionIntent;
    discovered: number;
    persisted: number;
    failed: number;
  }): void;
}

export interface SocialAccountConnectionsModuleInterface {
  begin(intent: ConnectionIntent, userId: string): BeginConnectionResult;
  complete(input: CompleteConnectionInput): Promise<CompleteConnectionResult>;
  list(userId: string): Promise<LinkedAccountPublicRecord[]>;
  disconnect(userId: string, platform: unknown): Promise<void>;
}
