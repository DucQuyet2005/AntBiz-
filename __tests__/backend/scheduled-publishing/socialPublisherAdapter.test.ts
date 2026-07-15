import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  postThread: vi.fn(),
  publishToInstagram: vi.fn(),
  publishToInstagramAccount: vi.fn(),
  publishToFacebookPage: vi.fn(),
}));

vi.mock('@/lib/threads', () => ({ postThread: mocks.postThread }));
vi.mock('@/lib/instagram', () => ({ publishToInstagram: mocks.publishToInstagram }));
vi.mock('@/lib/facebook', () => ({
  publishToInstagramAccount: mocks.publishToInstagramAccount,
  publishToFacebookPage: mocks.publishToFacebookPage,
}));

import { ProductionSocialPublisher } from '@/backend/modules/scheduled-publishing/social-publisher-adapter';

describe('ProductionSocialPublisher', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fails Threads publication without a linked access token', async () => {
    const result = await new ProductionSocialPublisher().publish({
      platform: 'thread', message: 'hello', imageUrls: [],
    });
    expect(result).toMatchObject({ success: false });
    expect(mocks.postThread).not.toHaveBeenCalled();
  });

  it('passes linked Facebook credentials to the legacy publisher', async () => {
    mocks.publishToFacebookPage.mockResolvedValue({ success: true, postId: 'fb-1' });
    await expect(new ProductionSocialPublisher().publish({
      platform: 'facebook', message: 'hello', imageUrls: ['https://img.test/a.jpg'],
      accountId: 'page-1', accessToken: 'token-1',
    })).resolves.toEqual({ success: true, postId: 'fb-1' });
    expect(mocks.publishToFacebookPage).toHaveBeenCalledWith(
      'hello', ['https://img.test/a.jpg'], 'page-1', 'token-1'
    );
  });
});
