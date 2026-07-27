import { SocialAccountConnectionsError } from './social-account-connections-errors';
import { parseDisconnectPlatform } from './social-account-connections-schemas';
import type {
  BeginConnectionResult,
  CompleteConnectionInput,
  CompleteConnectionResult,
  ConnectionIntent,
  ConnectionProvider,
  FacebookConnectionProvider,
  LinkedAccountRepository,
  OAuthStateProtector,
  SocialAccountConnectionsLogger,
  SocialAccountConnectionsModuleInterface,
  ThreadsConnectionProvider,
} from './social-account-connections-types';

const defaultLogger: SocialAccountConnectionsLogger = {
  connectionEvaluated(context) {
    console.info('[Social Account Connections] connection evaluated', context);
  },
};

export class SocialAccountConnectionsModule implements SocialAccountConnectionsModuleInterface {
  constructor(
    private readonly facebookProvider: FacebookConnectionProvider,
    private readonly threadsProvider: ThreadsConnectionProvider,
    private readonly repository: LinkedAccountRepository,
    private readonly stateProtector: OAuthStateProtector,
    private readonly logger: SocialAccountConnectionsLogger = defaultLogger
  ) {}

  begin(intent: ConnectionIntent, userId: string): BeginConnectionResult {
    const state = this.stateProtector.create(intent, userId);
    const authorizationUrl = intent === 'threads'
      ? this.threadsProvider.buildAuthorizationUrl(state.state)
      : this.facebookProvider.buildAuthorizationUrl(state.state);
    return { authorizationUrl, intent, nonce: state.nonce, expiresAt: state.expiresAt };
  }

  async complete(input: CompleteConnectionInput): Promise<CompleteConnectionResult> {
    const verified = this.stateProtector.verify(input.state, input.userId, input.nonce);
    validateProviderIntent(input.provider, verified.intent);

    if (!input.code.trim()) {
      throw new SocialAccountConnectionsError(
        'provider_denied',
        400,
        'Nhà cung cấp không trả về mã xác thực'
      );
    }

    const discovery = input.provider === 'facebook'
      ? await this.facebookProvider.discoverAccounts(input.code)
      : {
          candidates: [await this.threadsProvider.discoverAccount(input.code)],
          discoveryFailures: 0,
        };

    const outcomes: boolean[] = [];
    for (const candidate of discovery.candidates) {
      if (candidate.platform === verified.intent) {
        outcomes.push(await this.repository.upsert(input.userId, candidate));
      } else {
        outcomes.push(false);
      }
    }

    const requestedIndexes = discovery.candidates.flatMap((candidate, index) =>
      candidate.platform === verified.intent ? [index] : []
    );
    const persisted = outcomes.filter(Boolean).length;
    const failed = discovery.discoveryFailures + outcomes.filter((success) => !success).length;
    this.logger.connectionEvaluated({
      provider: input.provider,
      intent: verified.intent,
      discovered: discovery.candidates.length,
      persisted,
      failed,
    });

    if (requestedIndexes.length === 0) {
      throw new SocialAccountConnectionsError(
        'no_accounts',
        404,
        requestedAccountMessage(verified.intent),
        { context: safeCounts(input.provider, verified.intent, discovery.candidates.length, persisted, failed) }
      );
    }

    if (!requestedIndexes.some((index) => outcomes[index])) {
      throw new SocialAccountConnectionsError(
        'persistence_failed',
        500,
        'Không thể lưu tài khoản liên kết lúc này',
        { context: safeCounts(input.provider, verified.intent, discovery.candidates.length, persisted, failed) }
      );
    }

    return {
      intent: verified.intent,
      discovered: discovery.candidates.length,
      persisted,
      failed,
    };
  }

  list(userId: string) {
    return this.repository.list(userId);
  }

  async disconnect(userId: string, platform: unknown) {
    await this.repository.disconnect(userId, parseDisconnectPlatform(platform));
  }

  async refresh(userId: string, platform: string): Promise<{ success: boolean; expiresAt?: string }> {
    const dbPlatform = platform === 'threads' ? 'thread' : platform;
    if (dbPlatform !== 'thread') {
      throw new SocialAccountConnectionsError(
        'invalid_state',
        400,
        'Nền tảng này không hỗ trợ gia hạn token tự động'
      );
    }

    const tokenData = await this.repository.findAccessToken(userId, 'thread');
    if (!tokenData) {
      throw new SocialAccountConnectionsError(
        'no_accounts',
        404,
        'Không tìm thấy tài khoản liên kết phù hợp để gia hạn'
      );
    }

    const { accessToken, expiresAt } = await this.threadsProvider.refreshAccessToken(tokenData.accessToken);
    const success = await this.repository.updateToken(userId, 'thread', accessToken, expiresAt);
    return { success, expiresAt };
  }
}

function validateProviderIntent(provider: ConnectionProvider, intent: ConnectionIntent) {
  const isValid = provider === 'threads' ? intent === 'threads' : intent !== 'threads';
  if (!isValid) {
    throw new SocialAccountConnectionsError(
      'invalid_state',
      400,
      'Phiên liên kết không hợp lệ hoặc đã hết hạn'
    );
  }
}

function requestedAccountMessage(intent: ConnectionIntent) {
  if (intent === 'instagram') return 'Không tìm thấy tài khoản Instagram Business phù hợp';
  if (intent === 'facebook') return 'Không tìm thấy Facebook Page phù hợp';
  return 'Không tìm thấy tài khoản Threads phù hợp';
}

function safeCounts(
  provider: ConnectionProvider,
  intent: ConnectionIntent,
  discovered: number,
  persisted: number,
  failed: number
) {
  return { provider, intent, discovered, persisted, failed };
}
