import { SocialAccountConnectionsError } from './social-account-connections-errors';
import type {
  LinkedAccountCandidate,
  ThreadsConnectionProvider,
} from './social-account-connections-types';

const THREADS_AUTH_URL = 'https://threads.net/oauth/authorize';
const THREADS_GRAPH_URL = 'https://graph.threads.net';

export interface ThreadsConnectionConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

type ConfigProvider = () => ThreadsConnectionConfig;

export class ThreadsConnectionAdapter implements ThreadsConnectionProvider {
  constructor(
    private readonly fetchImplementation: typeof fetch = fetch,
    private readonly configProvider: ConfigProvider = defaultConfig
  ) { }

  buildAuthorizationUrl(state: string) {
    const config = this.requireConfig();
    const url = new URL(THREADS_AUTH_URL);
    url.search = new URLSearchParams({
      client_id: config.appId,
      redirect_uri: config.redirectUri,
      scope: 'threads_basic,threads_content_publish,threads_manage_insights',
      response_type: 'code',
      state,
    }).toString();
    return url.toString();
  }

  async discoverAccount(code: string): Promise<LinkedAccountCandidate> {
    const config = this.requireConfig();
    const shortTokenData = await this.requestJson(
      `${THREADS_GRAPH_URL}/oauth/access_token`,
      'short_token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.appId,
          client_secret: config.appSecret,
          grant_type: 'authorization_code',
          redirect_uri: config.redirectUri,
          code,
        }),
      }
    );
    const shortToken = requireString(shortTokenData, 'access_token', 'short_token');

    const longTokenData = await this.requestJson(
      `${THREADS_GRAPH_URL}/access_token?${new URLSearchParams({
        grant_type: 'th_exchange_token',
        client_secret: config.appSecret,
        access_token: shortToken,
      })}`,
      'long_token'
    );
    const longToken = requireString(longTokenData, 'access_token', 'long_token');
    const expiresIn = typeof longTokenData === 'object' && longTokenData !== null
      ? (longTokenData as any).expires_in
      : undefined;
    const expiresAt = typeof expiresIn === 'number'
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const profileData = await this.requestJson(
      `${THREADS_GRAPH_URL}/v1.0/me?fields=id,username&access_token=${encodeURIComponent(longToken)}`,
      'profile'
    );
    const accountId = requireString(profileData, 'id', 'profile');
    const accountName = requireString(profileData, 'username', 'profile');

    return {
      platform: 'threads',
      accountId,
      accountName,
      accessToken: longToken,
      expiresAt,
    };
  }

  async refreshAccessToken(accessToken: string): Promise<{ accessToken: string; expiresAt: string }> {
    const refreshData = await this.requestJson(
      `https://graph.threads.net/refresh_access_token?${new URLSearchParams({
        grant_type: 'th_refresh_token',
        access_token: accessToken,
      })}`,
      'refresh_token'
    );
    const newAccessToken = requireString(refreshData, 'access_token', 'refresh_token');
    const expiresIn = typeof refreshData === 'object' && refreshData !== null
      ? (refreshData as any).expires_in
      : undefined;
    if (typeof expiresIn !== 'number') {
      throw new SocialAccountConnectionsError(
        'provider_unavailable',
        502,
        'Threads API không trả về thời gian hết hạn mới'
      );
    }
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    return {
      accessToken: newAccessToken,
      expiresAt,
    };
  }

  private requireConfig() {
    const config = this.configProvider();
    if (!config.appId.trim() || !config.appSecret.trim() || !isHttpUrl(config.redirectUri)) {
      throw new SocialAccountConnectionsError(
        'configuration_error',
        500,
        'Kết nối Threads chưa được cấu hình'
      );
    }
    return config;
  }

  private async requestJson(url: string, operation: string, init?: RequestInit): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImplementation(url, init);
    } catch (cause) {
      throw providerFailure(operation, undefined, sanitizeCause(cause));
    }
    const data = await safeJson(response);
    if (!response.ok) throw providerFailure(operation, response.status);
    return data;
  }
}

function defaultConfig(): ThreadsConnectionConfig {
  return {
    appId: process.env.THREADS_APP_ID || '',
    appSecret: process.env.THREADS_APP_SECRET || '',
    redirectUri: process.env.THREADS_REDIRECT_URI || '',
  };
}

function requireString(value: unknown, key: string, operation: string) {
  if (typeof value === 'object' && value !== null) {
    const result = (value as Record<string, unknown>)[key];
    if (typeof result === 'string' && result.trim()) return result;
  }
  throw providerFailure(operation);
}

async function safeJson(response: Response) {
  try { return await response.json() as unknown; }
  catch { return undefined; }
}

function isHttpUrl(value: string) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
}

function providerFailure(operation: string, providerStatus?: number, cause?: unknown) {
  return new SocialAccountConnectionsError(
    'provider_unavailable',
    502,
    'Không thể kết nối Threads lúc này',
    { cause, context: { provider: 'threads', operation, providerStatus } }
  );
}

function sanitizeCause(cause: unknown) {
  return cause instanceof Error ? new Error(cause.name) : new Error('Provider request failed');
}
