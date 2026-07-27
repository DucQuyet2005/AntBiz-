export {
  FacebookConnectionAdapter,
  type FacebookConnectionConfig,
} from './facebook-connection-adapter';
export { HmacOAuthStateProtector } from './hmac-oauth-state-protector';
export { SupabaseLinkedAccountRepository } from './linked-account-repository';
export { SocialAccountConnectionsError } from './social-account-connections-errors';
export { createSocialAccountConnectionsModule } from './social-account-connections-factory';
export { SocialAccountConnectionsModule } from './social-account-connections-module';
export {
  parseConnectionIntent,
  parseDisconnectPlatform,
  peekOAuthStateIntent,
  toStoredPlatform,
} from './social-account-connections-schemas';
export {
  ThreadsConnectionAdapter,
  type ThreadsConnectionConfig,
} from './threads-connection-adapter';
export type {
  BeginConnectionResult,
  CompleteConnectionInput,
  CompleteConnectionResult,
  ConnectionDiscoveryResult,
  ConnectionIntent,
  ConnectionPlatform,
  ConnectionProvider,
  FacebookConnectionProvider,
  LinkedAccountCandidate,
  LinkedAccountPublicRecord,
  LinkedAccountRepository,
  OAuthStateProtector,
  SocialAccountConnectionsLogger,
  SocialAccountConnectionsModuleInterface,
  StoredConnectionPlatform,
  ThreadsConnectionProvider,
  VerifiedOAuthState,
} from './social-account-connections-types';
