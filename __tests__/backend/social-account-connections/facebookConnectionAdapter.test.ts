import { describe, expect, it, vi } from 'vitest';
import { FacebookConnectionAdapter } from '@/backend/modules/social-account-connections';

const config = {
  appId: 'facebook-app',
  appSecret: 'facebook-secret',
  redirectUri: 'https://antbiz.test/api/auth/facebook/callback',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('FacebookConnectionAdapter', () => {
  it('builds an authorization URL with signed state and current scopes', () => {
    const adapter = new FacebookConnectionAdapter(vi.fn(), () => config);
    const url = new URL(adapter.buildAuthorizationUrl('signed-state'));
    expect(url.searchParams.get('client_id')).toBe('facebook-app');
    expect(url.searchParams.get('redirect_uri')).toBe(config.redirectUri);
    expect(url.searchParams.get('state')).toBe('signed-state');
    expect(url.searchParams.get('scope')).toContain('pages_manage_posts');
    expect(url.searchParams.get('scope')).toContain('instagram_content_publish');
  });

  it('exchanges tokens and discovers every Page and Instagram account', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ access_token: 'short-token' }))
      .mockResolvedValueOnce(json({ access_token: 'long-token' }))
      .mockResolvedValueOnce(json({ data: [
        { id: 'page-1', name: 'Page One', access_token: 'page-token-1' },
        { id: 'page-2', name: 'Page Two', access_token: 'page-token-2' },
      ] }))
      .mockResolvedValueOnce(json({ instagram_business_account: { id: 'ig-1' } }))
      .mockResolvedValueOnce(json({ username: 'ig_one' }))
      .mockResolvedValueOnce(json({}));
    const adapter = new FacebookConnectionAdapter(fetchMock, () => config);

    await expect(adapter.discoverAccounts('authorization-code')).resolves.toEqual({
      candidates: [
        expect.objectContaining({ platform: 'facebook', accountId: 'page-1', accessToken: 'page-token-1' }),
        expect.objectContaining({ platform: 'facebook', accountId: 'page-2', accessToken: 'page-token-2' }),
        expect.objectContaining({ platform: 'instagram', accountId: 'ig-1', accountName: 'ig_one (qua Page: Page One)' }),
      ],
      discoveryFailures: 0,
    });
    expect(fetchMock.mock.calls[2][1]).toEqual({ headers: { Authorization: 'Bearer long-token' } });
  });

  it('keeps Page candidates when Instagram discovery fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ access_token: 'short-token' }))
      .mockResolvedValueOnce(json({ access_token: 'long-token' }))
      .mockResolvedValueOnce(json({ data: [
        { id: 'page-1', name: 'Page One', access_token: 'page-token' },
      ] }))
      .mockResolvedValueOnce(json({ error: { message: 'private provider detail' } }, 500));
    const adapter = new FacebookConnectionAdapter(fetchMock, () => config);

    await expect(adapter.discoverAccounts('authorization-code')).resolves.toMatchObject({
      candidates: [expect.objectContaining({ platform: 'facebook', accountId: 'page-1' })],
      discoveryFailures: 1,
    });
  });

  it('sanitizes provider failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ error: { message: 'secret provider response with token' } }, 401)
    );
    const adapter = new FacebookConnectionAdapter(fetchMock, () => config);
    try {
      await adapter.discoverAccounts('authorization-code-secret');
      throw new Error('Expected provider failure');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'provider_unavailable',
        context: { provider: 'facebook', operation: 'short_token', providerStatus: 401 },
      });
      expect(JSON.stringify(error)).not.toContain('secret provider response');
      expect(JSON.stringify(error)).not.toContain('authorization-code-secret');
      expect(JSON.stringify(error)).not.toContain('facebook-secret');
    }
  });

  it('rejects missing configuration before a provider call', () => {
    const fetchMock = vi.fn();
    const adapter = new FacebookConnectionAdapter(fetchMock, () => ({
      appId: '', appSecret: '', redirectUri: '',
    }));
    expect(() => adapter.buildAuthorizationUrl('state')).toThrowError(
      expect.objectContaining({ code: 'configuration_error' })
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
