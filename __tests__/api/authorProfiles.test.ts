import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { AuthorProfileError } from '@/backend/modules/author-profiles/errors';
import { GET, POST } from '@/app/api/author-profiles/route';
import { DELETE, PUT } from '@/app/api/author-profiles/[id]/route';
import { POST as collectSamples } from '@/app/api/author-profiles/[id]/train/route';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  build: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  collect: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({ requireUserWithRole: mocks.auth }));
vi.mock('@/app/api/author-profiles/_adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/api/author-profiles/_adapter')>();
  return { ...actual, buildAuthorProfileModule: mocks.build };
});

const context = (id = 'profile-1') => ({ params: Promise.resolve({ id }) });

describe('Author Profile route contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: { id: 'user-1' }, role: 'marketer_full', supabase: {}, unauthorized: null,
    });
    mocks.build.mockReturnValue({
      list: mocks.list,
      create: mocks.create,
      update: mocks.update,
      delete: mocks.delete,
      collectStyleSamples: mocks.collect,
    });
  });

  it('requires authentication for every handler', async () => {
    mocks.auth.mockResolvedValue({
      unauthorized: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const requests = [
      GET(),
      POST(new NextRequest('http://localhost/api/author-profiles', {
        method: 'POST', body: JSON.stringify({ name: 'Style' }),
      })),
      PUT(new NextRequest('http://localhost/api/author-profiles/profile-1', {
        method: 'PUT', body: JSON.stringify({ name: 'Style' }),
      }), context()),
      DELETE(new NextRequest('http://localhost/api/author-profiles/profile-1', {
        method: 'DELETE',
      }), context()),
      collectSamples(new NextRequest('http://localhost/api/author-profiles/profile-1/train', {
        method: 'POST',
      }), context()),
    ];
    for (const response of await Promise.all(requests)) expect(response.status).toBe(401);
  });

  it('lists profiles through the module', async () => {
    mocks.list.mockResolvedValue([{ id: 'profile-1', name: 'Style' }]);
    const response = await GET();
    await expect(response.json()).resolves.toEqual({ data: [{ id: 'profile-1', name: 'Style' }] });
    expect(mocks.list).toHaveBeenCalledWith({ userId: 'user-1', role: 'marketer_full' });
  });

  it('returns 400 for malformed or invalid create JSON', async () => {
    const malformed = await POST(new NextRequest('http://localhost/api/author-profiles', {
      method: 'POST', body: '{',
    }));
    const invalid = await POST(new NextRequest('http://localhost/api/author-profiles', {
      method: 'POST', body: JSON.stringify({ name: '' }),
    }));
    expect(malformed.status).toBe(400);
    expect(invalid.status).toBe(400);
  });

  it('creates a profile and preserves the 201 response shape', async () => {
    mocks.create.mockResolvedValue({ id: 'profile-1', name: 'Style' });
    const response = await POST(new NextRequest('http://localhost/api/author-profiles', {
      method: 'POST', body: JSON.stringify({ name: 'Style', source_url: '' }),
    }));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ data: { id: 'profile-1', name: 'Style' } });
    expect(mocks.create).toHaveBeenCalledWith(
      { userId: 'user-1', role: 'marketer_full' },
      { name: 'Style', source_url: '' }
    );
  });

  it('rejects lifecycle fields and malformed update JSON', async () => {
    const internal = await PUT(new NextRequest('http://localhost/api/author-profiles/profile-1', {
      method: 'PUT', body: JSON.stringify({ tuning_status: 'ready' }),
    }), context());
    const malformed = await PUT(new NextRequest('http://localhost/api/author-profiles/profile-1', {
      method: 'PUT', body: '{',
    }), context());
    expect(internal.status).toBe(400);
    expect(malformed.status).toBe(400);
  });

  it('updates and deletes using awaited route params', async () => {
    mocks.update.mockResolvedValue({ id: 'profile-1', name: 'Changed' });
    mocks.delete.mockResolvedValue({ deleted: true });
    const updateResponse = await PUT(new NextRequest('http://localhost/api/author-profiles/profile-1', {
      method: 'PUT', body: JSON.stringify({ name: 'Changed' }),
    }), context());
    const deleteResponse = await DELETE(new NextRequest('http://localhost/api/author-profiles/profile-1', {
      method: 'DELETE',
    }), context());
    await expect(updateResponse.json()).resolves.toEqual({ data: { id: 'profile-1', name: 'Changed' } });
    await expect(deleteResponse.json()).resolves.toEqual({ data: { deleted: true } });
    expect(mocks.update).toHaveBeenCalledWith(
      { userId: 'user-1', role: 'marketer_full' }, 'profile-1', { name: 'Changed' }
    );
    expect(mocks.delete).toHaveBeenCalledWith(
      { userId: 'user-1', role: 'marketer_full' }, 'profile-1'
    );
  });

  it('preserves the train endpoint response while calling Style Sample Collection', async () => {
    mocks.collect.mockResolvedValue({
      message: 'Done', sample_posts_count: 2, tuned_model_id: null, status: 'ready',
    });
    const response = await collectSamples(
      new NextRequest('http://localhost/api/author-profiles/profile-1/train', { method: 'POST' }),
      context()
    );
    await expect(response.json()).resolves.toMatchObject({
      sample_posts_count: 2, tuned_model_id: null, status: 'ready',
    });
    expect(mocks.collect).toHaveBeenCalledWith(
      { userId: 'user-1', role: 'marketer_full' }, 'profile-1'
    );
  });

  it.each([
    ['FORBIDDEN', 403],
    ['NOT_FOUND', 404],
    ['NO_SAMPLES', 422],
    ['SOURCE_FAILED', 500],
  ] as const)('maps %s errors to HTTP %i', async (code, status) => {
    mocks.collect.mockRejectedValue(new AuthorProfileError(
      code, status, `Error ${code}`
    ));
    const response = await collectSamples(
      new NextRequest('http://localhost/api/author-profiles/profile-1/train', { method: 'POST' }),
      context()
    );
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ error: `Error ${code}` });
  });
});
