import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { ScheduledPublishingError } from '@/backend/modules/scheduled-publishing/errors';
import { POST } from '@/app/api/scheduled-posts/publish-now/route';

const mocks = vi.hoisted(() => ({
  requireUserWithRole: vi.fn(),
  publishNow: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({ requireUserWithRole: mocks.requireUserWithRole }));
vi.mock('@/app/api/scheduled-posts/_adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/api/scheduled-posts/_adapter')>();
  return { ...actual, buildScheduledPublishingModule: () => ({ publishNow: mocks.publishNow }) };
});

function request(body: unknown) {
  return new NextRequest('http://localhost/api/scheduled-posts/publish-now', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/scheduled-posts/publish-now', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUserWithRole.mockResolvedValue({
      user: { id: 'user-1' }, role: 'marketer_full', supabase: {}, unauthorized: null,
    });
  });

  it('returns the existing unauthorized response', async () => {
    mocks.requireUserWithRole.mockResolvedValue({
      user: null, role: null, supabase: {},
      unauthorized: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    expect((await POST(request({ captionId: 'c1' }))).status).toBe(401);
  });

  it('returns 400 for malformed JSON or a missing caption ID', async () => {
    expect((await POST(request('{'))).status).toBe(400);
    expect((await POST(request({ imageUrls: [] }))).status).toBe(400);
  });

  it('publishes synchronously and returns the provider result', async () => {
    mocks.publishNow.mockResolvedValue({
      post: { id: 'sp1', status: 'posted' },
      externalPostId: 'external-1', platform: 'facebook',
      publishedAt: '2026-07-16T08:00:00.000Z',
    });
    const response = await POST(request({ captionId: 'c1', imageUrls: [] }));

    expect(response.status).toBe(200);
    expect(mocks.publishNow).toHaveBeenCalledWith(
      { userId: 'user-1', role: 'marketer_full' },
      { captionId: 'c1', imageUrls: [] }
    );
    await expect(response.json()).resolves.toMatchObject({
      data: { post: { status: 'posted' }, externalPostId: 'external-1' },
    });
  });

  it('maps provider failures without reporting success', async () => {
    mocks.publishNow.mockRejectedValue(new ScheduledPublishingError(
      'PUBLICATION_FAILED', 502, 'Provider down'
    ));
    const response = await POST(request({ captionId: 'c1' }));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: 'Provider down' });
  });
});
