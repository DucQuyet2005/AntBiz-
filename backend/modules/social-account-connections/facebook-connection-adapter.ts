import { SocialAccountConnectionsError } from './social-account-connections-errors';
import type {
  ConnectionDiscoveryResult,
  FacebookConnectionProvider,
  LinkedAccountCandidate,
} from './social-account-connections-types';

const GRAPH_BASE_URL = 'https://graph.facebook.com/v19.0';
const FACEBOOK_AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth';
const FACEBOOK_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_read_user_content',
  'pages_manage_posts',
  'read_insights',
  'instagram_basic',
  'instagram_content_publish',
  'business_management',
  'public_profile',
  'instagram_manage_comments',
  'instagram_manage_insights',
];

export interface FacebookConnectionConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

type ConfigProvider = () => FacebookConnectionConfig;

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}

export class FacebookConnectionAdapter implements FacebookConnectionProvider {
  constructor(
    private readonly fetchImplementation: typeof fetch = fetch,
    private readonly configProvider: ConfigProvider = defaultConfig
  ) { }

  buildAuthorizationUrl(state: string) {
    const config = this.requireConfig();
    const url = new URL(FACEBOOK_AUTH_URL);
    url.search = new URLSearchParams({
      client_id: config.appId,
      redirect_uri: config.redirectUri,
      scope: FACEBOOK_SCOPES.join(','),
      response_type: 'code',
      state,
    }).toString();
    return url.toString();
  }

  async discoverAccounts(code: string): Promise<ConnectionDiscoveryResult> {
    const config = this.requireConfig();
    const shortTokenData = await this.requestJson(
      `${GRAPH_BASE_URL}/oauth/access_token?${new URLSearchParams({
        client_id: config.appId,
        redirect_uri: config.redirectUri,
        client_secret: config.appSecret,
        code,
      })}`,
      'short_token'
    );
    const shortToken = requireString(shortTokenData, 'access_token', 'short_token');

    const longTokenData = await this.requestJson(
      `${GRAPH_BASE_URL}/oauth/access_token?${new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: config.appId,
        client_secret: config.appSecret,
        fb_exchange_token: shortToken,
      })}`,
      'long_token'
    );
    const longToken = requireString(longTokenData, 'access_token', 'long_token');

    const pagesData = await this.requestJson(
      `${GRAPH_BASE_URL}/me/accounts`,
      'list_pages',
      { headers: { Authorization: `Bearer ${longToken}` } }
    );
    const pages = parsePages(pagesData);
    const candidates: LinkedAccountCandidate[] = pages.map((page) => ({
      platform: 'facebook',
      accountId: page.id,
      accountName: page.name,
      accessToken: page.access_token,
    }));
    let discoveryFailures = 0;

    for (const page of pages) {
      try {
        const instagramData = await this.requestJson(
          `${GRAPH_BASE_URL}/${encodeURIComponent(page.id)}?fields=instagram_business_account`,
          'instagram_discovery',
          { headers: { Authorization: `Bearer ${page.access_token}` } }
        );
        const instagramId = readNestedString(instagramData, 'instagram_business_account', 'id');
        if (!instagramId) continue;

        let username = `IG_Account_${instagramId}`;
        try {
          const profileData = await this.requestJson(
            `${GRAPH_BASE_URL}/${encodeURIComponent(instagramId)}?fields=username`,
            'instagram_profile',
            { headers: { Authorization: `Bearer ${page.access_token}` } }
          );
          username = readString(profileData, 'username') || username;
        } catch {
          discoveryFailures += 1;
        }

        candidates.push({
          platform: 'instagram',
          accountId: instagramId,
          accountName: `${username} (qua Page: ${page.name})`,
          accessToken: page.access_token,
        });
      } catch {
        discoveryFailures += 1;
      }
    }

    return { candidates, discoveryFailures };
  }

  private requireConfig() {
    const config = this.configProvider();
    if (!config.appId.trim() || !config.appSecret.trim() || !isHttpUrl(config.redirectUri)) {
      throw configurationError();
    }
    return config;
  }

  private async requestJson(
    url: string,
    operation: string,
    init?: RequestInit
  ): Promise<unknown> {
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

function defaultConfig(): FacebookConnectionConfig {
  return {
    appId: process.env.FB_APP_ID || '',
    appSecret: process.env.FB_APP_SECRET || '',
    redirectUri: process.env.FB_REDIRECT_URI || '',
  };
}

function parsePages(value: unknown): FacebookPage[] {
  if (typeof value !== 'object' || value === null) return [];
  const data = (value as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  return data.flatMap((page) => {
    if (typeof page !== 'object' || page === null) return [];
    const id = readString(page, 'id');
    const name = readString(page, 'name');
    const accessToken = readString(page, 'access_token');
    return id && name && accessToken ? [{ id, name, access_token: accessToken }] : [];
  });
}

function requireString(value: unknown, key: string, operation: string) {
  const result = readString(value, key);
  if (!result) throw providerFailure(operation);
  return result;
}

function readString(value: unknown, key: string) {
  if (typeof value !== 'object' || value === null) return undefined;
  const result = (value as Record<string, unknown>)[key];
  return typeof result === 'string' && result.trim() ? result : undefined;
}

function readNestedString(value: unknown, parent: string, key: string) {
  if (typeof value !== 'object' || value === null) return undefined;
  return readString((value as Record<string, unknown>)[parent], key);
}

async function safeJson(response: Response) {
  try { return await response.json() as unknown; }
  catch { return undefined; }
}

function isHttpUrl(value: string) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
}

function configurationError() {
  return new SocialAccountConnectionsError(
    'configuration_error',
    500,
    'Kết nối Facebook/Instagram chưa được cấu hình'
  );
}

function providerFailure(operation: string, providerStatus?: number, cause?: unknown) {
  return new SocialAccountConnectionsError(
    'provider_unavailable',
    502,
    'Không thể kết nối Facebook/Instagram lúc này',
    { cause, context: { provider: 'facebook', operation, providerStatus } }
  );
}

function sanitizeCause(cause: unknown) {
  return cause instanceof Error ? new Error(cause.name) : new Error('Provider request failed');
}
