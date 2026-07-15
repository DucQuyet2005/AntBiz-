import { describe, expect, it, vi } from 'vitest';
import {
  SocialAccountConnectionsModule,
  type FacebookConnectionProvider,
  type LinkedAccountCandidate,
  type LinkedAccountRepository,
  type OAuthStateProtector,
  type SocialAccountConnectionsLogger,
  type ThreadsConnectionProvider,
} from '@/backend/modules/social-account-connections';

const facebookCandidate: LinkedAccountCandidate = {
  platform: 'facebook',
  accountId: 'page-1',
  accountName: 'Page One',
  accessToken: 'page-token',
};
const instagramCandidate: LinkedAccountCandidate = {
  platform: 'instagram',
  accountId: 'ig-1',
  accountName: 'instagram-one',
  accessToken: 'page-token',
};
const threadsCandidate: LinkedAccountCandidate = {
  platform: 'threads',
  accountId: 'threads-1',
  accountName: 'threads-one',
  accessToken: 'threads-token',
};

function setup(intent: 'facebook' | 'instagram' | 'threads' = 'facebook') {
  const facebookProvider: FacebookConnectionProvider = {
    buildAuthorizationUrl: vi.fn((state) => `https://facebook.test/oauth?state=${state}`),
    discoverAccounts: vi.fn().mockResolvedValue({
      candidates: [facebookCandidate, instagramCandidate],
      discoveryFailures: 0,
    }),
  };
  const threadsProvider: ThreadsConnectionProvider = {
    buildAuthorizationUrl: vi.fn((state) => `https://threads.test/oauth?state=${state}`),
    discoverAccount: vi.fn().mockResolvedValue(threadsCandidate),
  };
  const repository: LinkedAccountRepository = {
    list: vi.fn().mockResolvedValue([]),
    upsert: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(undefined),
  };
  const stateProtector: OAuthStateProtector = {
    create: vi.fn().mockReturnValue({ state: 'signed-state', nonce: 'nonce', expiresAt: 123 }),
    verify: vi.fn().mockReturnValue({
      intent,
      userId: 'user-001',
      nonce: 'nonce',
      issuedAt: 1,
      expiresAt: 2,
    }),
  };
  const logger: SocialAccountConnectionsLogger = { connectionEvaluated: vi.fn() };
  return {
    module: new SocialAccountConnectionsModule(
      facebookProvider,
      threadsProvider,
      repository,
      stateProtector,
      logger
    ),
    facebookProvider,
    threadsProvider,
    repository,
    stateProtector,
    logger,
  };
}

describe('SocialAccountConnectionsModule', () => {
  it('begins Facebook and Threads through the matching provider', () => {
    const facebook = setup('facebook');
    expect(facebook.module.begin('facebook', 'user-001')).toMatchObject({
      authorizationUrl: 'https://facebook.test/oauth?state=signed-state',
      nonce: 'nonce',
    });
    expect(facebook.facebookProvider.buildAuthorizationUrl).toHaveBeenCalledWith('signed-state');

    const threads = setup('threads');
    threads.module.begin('threads', 'user-001');
    expect(threads.threadsProvider.buildAuthorizationUrl).toHaveBeenCalledWith('signed-state');
  });

  it('preserves Facebook partial success when the requested Page persists', async () => {
    const { module, repository, logger } = setup('facebook');
    vi.mocked(repository.upsert)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await expect(module.complete({
      provider: 'facebook', code: 'code', state: 'state', nonce: 'nonce', userId: 'user-001',
    })).resolves.toEqual({ intent: 'facebook', discovered: 2, persisted: 1, failed: 1 });
    expect(logger.connectionEvaluated).toHaveBeenCalledWith({
      provider: 'facebook', intent: 'facebook', discovered: 2, persisted: 1, failed: 1,
    });
  });

  it('stores discovered Pages but returns no_accounts when Instagram is absent', async () => {
    const { module, facebookProvider, repository } = setup('instagram');
    vi.mocked(facebookProvider.discoverAccounts).mockResolvedValue({
      candidates: [facebookCandidate],
      discoveryFailures: 1,
    });

    await expect(module.complete({
      provider: 'facebook', code: 'code', state: 'state', nonce: 'nonce', userId: 'user-001',
    })).rejects.toMatchObject({ code: 'no_accounts', status: 404 });
    expect(repository.upsert).toHaveBeenCalledWith('user-001', facebookCandidate);
  });

  it('returns persistence_failed when no requested account can be stored', async () => {
    const { module, repository } = setup('instagram');
    vi.mocked(repository.upsert).mockResolvedValue(false);
    await expect(module.complete({
      provider: 'facebook', code: 'code', state: 'state', nonce: 'nonce', userId: 'user-001',
    })).rejects.toMatchObject({ code: 'persistence_failed', status: 500 });
  });

  it('verifies state before rejecting a missing code', async () => {
    const { module, stateProtector, facebookProvider } = setup('facebook');
    await expect(module.complete({
      provider: 'facebook', code: '', state: 'state', nonce: 'nonce', userId: 'user-001',
    })).rejects.toMatchObject({ code: 'provider_denied' });
    expect(stateProtector.verify).toHaveBeenCalledWith('state', 'user-001', 'nonce');
    expect(facebookProvider.discoverAccounts).not.toHaveBeenCalled();
  });

  it('rejects a provider that does not match signed intent', async () => {
    const { module, threadsProvider } = setup('facebook');
    await expect(module.complete({
      provider: 'threads', code: 'code', state: 'state', nonce: 'nonce', userId: 'user-001',
    })).rejects.toMatchObject({ code: 'invalid_state' });
    expect(threadsProvider.discoverAccount).not.toHaveBeenCalled();
  });

  it('normalizes Threads disconnect and delegates list', async () => {
    const { module, repository } = setup();
    vi.mocked(repository.list).mockResolvedValue([{
      id: '1', platform: 'thread', account_id: 'threads-1', account_name: 'threads-one',
    }]);
    await expect(module.list('user-001')).resolves.toHaveLength(1);
    await module.disconnect('user-001', 'threads');
    expect(repository.disconnect).toHaveBeenCalledWith('user-001', 'thread');
  });
});
