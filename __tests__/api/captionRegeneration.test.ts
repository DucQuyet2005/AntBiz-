import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { CaptionManagementError } from '@/backend/modules/caption-management/errors';
import { POST } from '@/app/api/captions/[id]/regenerate/route';

const mocks = vi.hoisted(() => ({
  requireUserWithRole: vi.fn(),
  regenerate: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({ requireUserWithRole: mocks.requireUserWithRole }));
vi.mock('@/app/api/captions/_regeneration-adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/api/captions/_regeneration-adapter')>();
  return { ...actual, buildCaptionRegenerationModule: () => ({ regenerate: mocks.regenerate }) };
});

function request(body: unknown) {
  return new NextRequest('http://localhost/api/captions/caption-1/regenerate', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ id: 'caption-1' }) };

describe('POST /api/captions/[id]/regenerate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUserWithRole.mockResolvedValue({
      user: { id: 'user-1' }, role: 'marketer_content', supabase: {}, unauthorized: null,
    });
  });

  it('returns the existing unauthorized response', async () => {
    mocks.requireUserWithRole.mockResolvedValue({
      user: null, role: null, supabase: {},
      unauthorized: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    expect((await POST(request({ mode: 'full' }), context)).status).toBe(401);
  });

  it('returns 400 for malformed or invalid partial commands', async () => {
    expect((await POST(request('{'), context)).status).toBe(400);
    expect((await POST(request({
      mode: 'partial', selectionStart: 4, selectionEnd: 2,
      selectedText: 'x', instruction: 'Rewrite',
    }), context)).status).toBe(400);
  });

  it('passes the actor, caption ID, and validated command to the module', async () => {
    mocks.regenerate.mockResolvedValue({
      caption: { id: 'caption-1', edited_content: 'New' },
      mode: 'partial', generatedText: 'New', replacementRange: { start: 0, end: 3 },
    });
    const response = await POST(request({
      mode: 'partial', selectionStart: 0, selectionEnd: 3,
      selectedText: 'Old', instruction: 'Rewrite', presetMode: 'none',
    }), context);

    expect(response.status).toBe(200);
    expect(mocks.regenerate).toHaveBeenCalledWith(
      { id: 'user-1', role: 'marketer_content' },
      'caption-1',
      expect.objectContaining({ mode: 'partial', presetMode: 'none' })
    );
    await expect(response.json()).resolves.toMatchObject({ data: { mode: 'partial' } });
  });

  it('maps stale selections to 409', async () => {
    mocks.regenerate.mockRejectedValue(new CaptionManagementError(
      'CAPTION_STALE', 409, 'Nội dung caption đã thay đổi'
    ));
    const response = await POST(request({ mode: 'full' }), context);
    expect(response.status).toBe(409);
  });
});
