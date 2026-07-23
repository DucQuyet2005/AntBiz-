import { describe, expect, it, vi } from 'vitest';
import { ThreadsConnectionAdapter } from '@/backend/modules/social-account-connections';

const config = {
  appId: 'threads-app',
  appSecret: 'threads-secret',
  redirectUri: 'https://antbiz.test/api/auth/threads/callback',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ThreadsConnectionAdapter', () => {
  it('builds the authorization URL with signed state', () => {
    const adapter = new ThreadsConnectionAdapter(vi.fn(), () => config);
    const url = new URL(adapter.buildAuthorizationUrl('signed-state'));
    expect(url.searchParams.get('client_id')).toBe('threads-app');
    expect(url.searchParams.get('state')).toBe('signed-state');
    expect(url.searchParams.get('scope')).toBe('threads_basic,threads_content_publish,threads_manage_insights');
  });

  it('exchanges tokens and returns a normalized profile candidate', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ access_token: 'short-token' }))
      .mockResolvedValueOnce(json({ access_token: 'long-token' }))
      .mockResolvedValueOnce(json({ id: 'threads-1', username: 'thread_user' }));
    const adapter = new ThreadsConnectionAdapter(fetchMock, () => config);

    await expect(adapter.discoverAccount('authorization-code')).resolves.toEqual({
      platform: 'threads',
      accountId: 'threads-1',
      accountName: 'thread_user',
      accessToken: 'long-token',
      expiresAt: null,
    });
    const shortRequest = fetchMock.mock.calls[0][1] as RequestInit;
    expect(shortRequest.method).toBe('POST');
    expect(String(shortRequest.body)).toContain('code=authorization-code');
    expect(fetchMock.mock.calls[1][0]).toContain('grant_type=th_exchange_token');
    expect(fetchMock.mock.calls[2][0]).toContain('/v1.0/me?fields=id,username');
  });

  it('sanitizes failed provider responses and credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ error_message: 'secret provider body' }, 400)
    );
    const adapter = new ThreadsConnectionAdapter(fetchMock, () => config);
    try {
      await adapter.discoverAccount('secret-code');
      throw new Error('Expected provider failure');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'provider_unavailable',
        context: { provider: 'threads', operation: 'short_token', providerStatus: 400 },
      });
      expect(JSON.stringify(error)).not.toContain('secret provider body');
      expect(JSON.stringify(error)).not.toContain('secret-code');
      expect(JSON.stringify(error)).not.toContain('threads-secret');
    }
  });

  it('requires complete provider configuration', () => {
    const fetchMock = vi.fn();
    const adapter = new ThreadsConnectionAdapter(fetchMock, () => ({
      appId: 'id', appSecret: '', redirectUri: 'not-a-url',
    }));
    expect(() => adapter.buildAuthorizationUrl('state')).toThrowError(
      expect.objectContaining({ code: 'configuration_error' })
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
