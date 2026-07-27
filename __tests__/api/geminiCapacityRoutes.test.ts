import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GeminiCapacityError } from '@/backend/modules/gemini-capacity/errors';

const mocks = vi.hoisted(() => ({
  requireUserWithRole: vi.fn(),
  createModule: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({ requireUserWithRole: mocks.requireUserWithRole }));
vi.mock('@/backend/modules/gemini-capacity/gemini-capacity-factory', () => ({
  createAdminGeminiCapacityModule: mocks.createModule,
}));

import { GET, POST } from '@/app/api/admin/gemini-keys/route';
import { DELETE, PATCH } from '@/app/api/admin/gemini-keys/[id]/route';

const KEY_ID = '11111111-1111-4111-8111-111111111111';
const supabase = {};
const keySummary = {
  id: KEY_ID,
  label: 'Primary',
  status: 'active',
  rate_limited_until: null,
  error_count: 0,
  last_used_at: null,
  created_at: '2026-07-16T00:00:00.000Z',
  updated_at: '2026-07-16T00:00:00.000Z',
  masked_value: 'AIzaS...secret',
};
const capacity = {
  listKeys: vi.fn(),
  createKey: vi.fn(),
  updateKey: vi.fn(),
  deleteKey: vi.fn(),
};

function request(path: string, method = 'GET', body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    ...(body === undefined ? {} : {
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  });
}

describe('Gemini Capacity admin Route Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createModule.mockReturnValue(capacity);
    mocks.requireUserWithRole.mockResolvedValue({
      supabase,
      user: { id: 'admin-1' },
      role: 'admin',
      unauthorized: null,
    });
    capacity.listKeys.mockResolvedValue([keySummary]);
    capacity.createKey.mockResolvedValue(keySummary);
    capacity.updateKey.mockResolvedValue(keySummary);
    capacity.deleteKey.mockResolvedValue({ success: true });
  });

  it('requires administrator authorization before module work', async () => {
    const unauthorized = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mocks.requireUserWithRole.mockResolvedValue({ supabase, user: null, unauthorized });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(capacity.listKeys).not.toHaveBeenCalled();
    expect(mocks.requireUserWithRole).toHaveBeenCalledWith(['admin']);
  });

  it('lists only the masked administrative projection', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ data: [keySummary] });
    expect(JSON.stringify(body)).not.toContain('key_value');
  });

  it('passes a write-only secret into creation without returning it', async () => {
    const response = await POST(request('/api/admin/gemini-keys', 'POST', {
      key_value: 'raw-secret',
      label: 'Primary',
    }));
    const body = await response.json();

    expect(capacity.createKey).toHaveBeenCalledWith({
      key_value: 'raw-secret',
      label: 'Primary',
    });
    expect(body).toEqual({ data: keySummary });
    expect(JSON.stringify(body)).not.toContain('raw-secret');
  });

  it('returns 400 for malformed JSON and duplicate keys', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const malformed = await POST(request('/api/admin/gemini-keys', 'POST', '{invalid'));

    capacity.createKey.mockRejectedValue(new GeminiCapacityError(
      'DUPLICATE_KEY',
      'API Key này đã tồn tại trong hệ thống'
    ));
    const duplicate = await POST(request('/api/admin/gemini-keys', 'POST', {
      key_value: 'duplicate',
      label: 'Duplicate',
    }));

    expect(malformed.status).toBe(400);
    expect(duplicate.status).toBe(400);
  });

  it('awaits Next 16 params and preserves update/delete envelopes', async () => {
    const updated = await PATCH(
      request(`/api/admin/gemini-keys/${KEY_ID}`, 'PATCH', { status: 'invalid' }),
      { params: Promise.resolve({ id: KEY_ID }) }
    );
    const deleted = await DELETE(
      request(`/api/admin/gemini-keys/${KEY_ID}`, 'DELETE'),
      { params: Promise.resolve({ id: KEY_ID }) }
    );

    expect(updated.status).toBe(200);
    expect(await updated.json()).toEqual({ data: keySummary });
    expect(capacity.updateKey).toHaveBeenCalledWith(KEY_ID, { status: 'invalid' });
    expect(await deleted.json()).toEqual({ success: true });
    expect(capacity.deleteKey).toHaveBeenCalledWith(KEY_ID);
  });

  it('maps missing keys to 404 without exposing persistence details', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    capacity.updateKey.mockRejectedValue(new GeminiCapacityError(
      'KEY_NOT_FOUND',
      'Không tìm thấy Gemini API Key'
    ));

    const response = await PATCH(
      request(`/api/admin/gemini-keys/${KEY_ID}`, 'PATCH', { label: 'Changed' }),
      { params: Promise.resolve({ id: KEY_ID }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Không tìm thấy Gemini API Key' });
  });
});
