import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { CaptionManagementError } from '@/backend/modules/caption-management/errors';
import { GET, PUT } from '@/app/api/captions/[id]/route';

const mocks = vi.hoisted(() => ({
  requireUserWithRole: vi.fn(),
  buildModule: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({ requireUserWithRole: mocks.requireUserWithRole }));
vi.mock('@/app/api/captions/_management-adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/api/captions/_management-adapter')>();
  return { ...actual, buildCaptionManagementModule: mocks.buildModule };
});

const params = { params: Promise.resolve({ id: 'caption-1' }) };

describe('/api/captions/[id] contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUserWithRole.mockResolvedValue({
      user: { id: 'user-1' }, role: 'marketer_content', supabase: {}, unauthorized: null,
    });
    mocks.buildModule.mockReturnValue({ get: mocks.get, update: mocks.update });
  });

  it('returns the existing unauthorized response', async () => {
    mocks.requireUserWithRole.mockResolvedValue({
      unauthorized: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    expect((await GET(new NextRequest('http://localhost/api/captions/caption-1'), params)).status).toBe(401);
  });

  it('gets a caption through the module', async () => {
    mocks.get.mockResolvedValue({ id: 'caption-1', ai_content: 'AI' });
    const response = await GET(new NextRequest('http://localhost/api/captions/caption-1'), params);
    await expect(response.json()).resolves.toEqual({ data: { id: 'caption-1', ai_content: 'AI' } });
    expect(mocks.get).toHaveBeenCalledWith(
      { id: 'user-1', role: 'marketer_content' }, 'caption-1'
    );
  });

  it('maps typed not-found errors', async () => {
    mocks.get.mockRejectedValue(
      new CaptionManagementError('CAPTION_NOT_FOUND', 404, 'Không tìm thấy caption')
    );
    expect((await GET(new NextRequest('http://localhost/api/captions/missing'), params)).status).toBe(404);
  });

  it('returns 400 for malformed JSON or an empty update', async () => {
    const malformed = await PUT(new NextRequest('http://localhost/api/captions/caption-1', {
      method: 'PUT', body: '{',
    }), params);
    const empty = await PUT(new NextRequest('http://localhost/api/captions/caption-1', {
      method: 'PUT', body: '{}',
    }), params);
    expect(malformed.status).toBe(400);
    expect(empty.status).toBe(400);
  });

  it('updates a caption through the module', async () => {
    mocks.update.mockResolvedValue({ id: 'caption-1', edited_content: 'Human' });
    const response = await PUT(new NextRequest('http://localhost/api/captions/caption-1', {
      method: 'PUT', body: JSON.stringify({ edited_content: 'Human' }),
    }), params);
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(
      { id: 'user-1', role: 'marketer_content' },
      'caption-1',
      { edited_content: 'Human' }
    );
  });

  it('maps access and lock errors to their typed status', async () => {
    mocks.update.mockRejectedValueOnce(
      new CaptionManagementError('CAPTION_ACCESS_DENIED', 403, 'Bạn không có quyền sửa caption này')
    );
    const denied = await PUT(new NextRequest('http://localhost/api/captions/caption-1', {
      method: 'PUT', body: JSON.stringify({ status: 'approved' }),
    }), params);
    mocks.update.mockRejectedValueOnce(
      new CaptionManagementError('CAPTION_LOCKED', 400, 'Không thể chỉnh sửa')
    );
    const locked = await PUT(new NextRequest('http://localhost/api/captions/caption-1', {
      method: 'PUT', body: JSON.stringify({ status: 'draft' }),
    }), params);
    expect(denied.status).toBe(403);
    expect(locked.status).toBe(400);
  });
});
