import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/captions/route';
import { POST as POST_VERSION } from '@/app/api/captions/versions/route';

const mocks = vi.hoisted(() => ({
  requireUserWithRole: vi.fn(),
  buildModule: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
  createVersion: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({ requireUserWithRole: mocks.requireUserWithRole }));
vi.mock('@/app/api/captions/_management-adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/api/captions/_management-adapter')>();
  return { ...actual, buildCaptionManagementModule: mocks.buildModule };
});

const validCreate = {
  article_id: '11111111-1111-4111-8111-111111111111',
  platform: 'threads',
  ai_content: 'AI content',
};

describe('/api/captions collection and versions contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUserWithRole.mockResolvedValue({
      user: { id: 'user-1' }, role: 'marketer_content', supabase: {}, unauthorized: null,
    });
    mocks.buildModule.mockReturnValue({
      create: mocks.create, list: mocks.list, createVersion: mocks.createVersion,
    });
  });

  it('validates and creates a normalized caption', async () => {
    mocks.create.mockResolvedValue({ id: 'caption-1' });
    const response = await POST(new NextRequest('http://localhost/api/captions', {
      method: 'POST', body: JSON.stringify(validCreate),
    }));
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(
      { id: 'user-1', role: 'marketer_content' },
      expect.objectContaining({ platform: 'thread' })
    );
  });

  it('returns schema details for invalid create input', async () => {
    const response = await POST(new NextRequest('http://localhost/api/captions', {
      method: 'POST', body: JSON.stringify({ platform: 'facebook' }),
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty('details');
  });

  it('rejects invalid pagination and returns list metadata', async () => {
    const invalid = await GET(new NextRequest('http://localhost/api/captions?page=0'));
    expect(invalid.status).toBe(400);
    mocks.list.mockResolvedValue({ data: [], total: 0, page: 2, limit: 5, totalPages: 0 });
    const valid = await GET(new NextRequest('http://localhost/api/captions?page=2&limit=5'));
    await expect(valid.json()).resolves.toEqual({
      data: [], total: 0, page: 2, limit: 5, totalPages: 0,
    });
  });

  it('validates and creates an explicit caption version', async () => {
    mocks.createVersion.mockResolvedValue({ id: 'version-1', version_number: 1 });
    const response = await POST_VERSION(new NextRequest('http://localhost/api/captions/versions', {
      method: 'POST',
      body: JSON.stringify({
        article_id: validCreate.article_id,
        platform: 'instagram',
        content: 'Version content',
        source: 'human',
      }),
    }));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ data: { id: 'version-1', version_number: 1 } });
  });

  it('returns 400 for malformed version JSON', async () => {
    const response = await POST_VERSION(new NextRequest('http://localhost/api/captions/versions', {
      method: 'POST', body: '{',
    }));
    expect(response.status).toBe(400);
  });
});
