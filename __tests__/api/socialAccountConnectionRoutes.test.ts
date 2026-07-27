import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  begin: vi.fn(),
  complete: vi.fn(),
  list: vi.fn(),
  disconnect: vi.fn(),
  requireUserWithRole: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({
  requireUserWithRole: mocks.requireUserWithRole,
}));

vi.mock('@/backend/modules/social-account-connections', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/backend/modules/social-account-connections')>();
  return {
    ...actual,
    createSocialAccountConnectionsModule: () => ({
      begin: mocks.begin,
      complete: mocks.complete,
      list: mocks.list,
      disconnect: mocks.disconnect,
    }),
  };
});

import { GET as startFacebook } from '@/app/api/auth/facebook/route';
import { GET as startInstagram } from '@/app/api/auth/instagram/route';
import { GET as startThreads } from '@/app/api/auth/threads/route';
import { GET as completeFacebook } from '@/app/api/auth/facebook/callback/route';
import { GET as completeThreads } from '@/app/api/auth/threads/callback/route';
import { DELETE as disconnectAccount, GET as listAccounts } from '@/app/api/linked-accounts/route';
import { SocialAccountConnectionsError } from '@/backend/modules/social-account-connections';

function stateFor(intent: 'facebook' | 'instagram' | 'threads') {
  const payload = Buffer.from(JSON.stringify({ intent })).toString('base64url');
  return `${payload}.signature`;
}

describe('Social Account Connections routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://antbiz.test';
    mocks.requireUserWithRole.mockResolvedValue({
      user: { id: 'user-001' },
      role: 'marketer_content',
      supabase: {},
      unauthorized: null,
    });
    mocks.begin.mockImplementation((intent: string) => ({
      authorizationUrl: `https://provider.test/oauth/${intent}`,
      intent,
      nonce: `nonce-${intent}`,
      expiresAt: 123,
    }));
    mocks.complete.mockResolvedValue({
      intent: 'facebook', discovered: 1, persisted: 1, failed: 0,
    });
    mocks.list.mockResolvedValue([{ id: '1', platform: 'facebook', account_id: 'page-1' }]);
    mocks.disconnect.mockResolvedValue(undefined);
  });

  it('authenticates before starting a provider flow', async () => {
    const unauthorized = new Response('Unauthorized', { status: 401 });
    mocks.requireUserWithRole.mockResolvedValue({ unauthorized });
    const response = await startFacebook(new NextRequest('http://localhost/api/auth/facebook'));
    expect(response).toBe(unauthorized);
    expect(mocks.begin).not.toHaveBeenCalled();
  });

  it.each([
    ['facebook', startFacebook, '/api/auth/facebook/callback'],
    ['instagram', startInstagram, '/api/auth/facebook/callback'],
    ['threads', startThreads, '/api/auth/threads/callback'],
  ] as const)('starts signed %s OAuth and sets an intent cookie', async (intent, handler, path) => {
    const response = await handler(new NextRequest(`http://localhost/api/auth/${intent}`));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`https://provider.test/oauth/${intent}`);
    expect(mocks.begin).toHaveBeenCalledWith(intent, 'user-001');
    const cookie = response.headers.get('set-cookie') || '';
    expect(cookie).toContain(`antbiz_social_oauth_${intent}=nonce-${intent}`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=lax');
    expect(cookie).toContain(`Path=${path}`);
  });

  it('completes Facebook using the matching nonce and clears provider cookies', async () => {
    const state = stateFor('facebook');
    const request = new NextRequest(
      `http://localhost/api/auth/facebook/callback?code=code-1&state=${encodeURIComponent(state)}`,
      { headers: { Cookie: 'antbiz_social_oauth_facebook=nonce-facebook' } }
    );
    const response = await completeFacebook(request);

    expect(mocks.complete).toHaveBeenCalledWith({
      provider: 'facebook',
      code: 'code-1',
      state,
      nonce: 'nonce-facebook',
      userId: 'user-001',
    });
    expect(response.headers.get('location')).toBe(
      'https://antbiz.test/settings?connected=success&platform=facebook'
    );
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('redirects Threads failures with only a stable code', async () => {
    const state = stateFor('threads');
    mocks.complete.mockRejectedValue(new SocialAccountConnectionsError(
      'provider_unavailable',
      502,
      'Provider failed',
      { cause: new Error('raw secret provider response') }
    ));
    const request = new NextRequest(
      `http://localhost/api/auth/threads/callback?code=secret-code&state=${encodeURIComponent(state)}`,
      { headers: { Cookie: 'antbiz_social_oauth_threads=nonce-threads' } }
    );
    const response = await completeThreads(request);
    const location = response.headers.get('location') || '';

    expect(location).toBe(
      'https://antbiz.test/settings?connected=failed&platform=threads&error=provider_unavailable'
    );
    expect(location).not.toContain('raw secret');
    expect(location).not.toContain('secret-code');
  });

  it('preserves token-free list and disconnect JSON contracts', async () => {
    const listResponse = await listAccounts(
      new NextRequest('http://localhost/api/linked-accounts')
    );
    await expect(listResponse.json()).resolves.toEqual({
      data: [{ id: '1', platform: 'facebook', account_id: 'page-1' }],
    });

    const deleteResponse = await disconnectAccount(
      new NextRequest('http://localhost/api/linked-accounts?platform=threads', { method: 'DELETE' })
    );
    expect(mocks.disconnect).toHaveBeenCalledWith('user-001', 'threads');
    await expect(deleteResponse.json()).resolves.toEqual({
      success: true,
      message: 'Đã hủy liên kết thành công',
    });
  });
});
