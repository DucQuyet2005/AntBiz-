import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const authMock = vi.hoisted(() => ({ requireUserWithRole: vi.fn() }));

vi.mock('@/lib/api/auth', () => ({
  requireUserWithRole: authMock.requireUserWithRole,
}));

import { GET, POST } from '@/app/api/platform-presets/route';
import { PUT, DELETE } from '@/app/api/platform-presets/[id]/route';

let rows: Array<Record<string, unknown>> = [];

class QueryBuilder {
  private filters: Array<{ column: string; value: unknown; kind: 'eq' | 'is' }> = [];
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: unknown;

  select() { return this; }
  eq(column: string, value: unknown) {
    this.filters.push({ column, value, kind: 'eq' });
    return this;
  }
  is(column: string, value: unknown) {
    this.filters.push({ column, value, kind: 'is' });
    return this;
  }
  insert(payload: unknown) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }
  upsert(payload: unknown) {
    this.action = 'upsert';
    this.payload = payload;
    return this;
  }
  update(payload: unknown) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }
  delete() {
    this.action = 'delete';
    return this;
  }

  private filtered() {
    return rows.filter((row) => this.filters.every((filter) => {
      if (filter.kind === 'is') return row[filter.column] === filter.value;
      return row[filter.column] === filter.value;
    }));
  }

  private execute() {
    if (this.action === 'insert') {
      const inputs = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = inputs.map((input, index) => ({
        id: `inserted-${rows.length + index + 1}`,
        ...(input as Record<string, unknown>),
      }));
      rows.push(...inserted);
      return inserted;
    }

    if (this.action === 'upsert') {
      const input = this.payload as Record<string, unknown>;
      const existing = rows.find(
        (row) => row.user_id === input.user_id && row.platform === input.platform && row.name === input.name
      );
      if (existing) {
        Object.assign(existing, input);
        return [existing];
      }
      const inserted = { id: `upserted-${rows.length + 1}`, ...input };
      rows.push(inserted);
      return [inserted];
    }

    const matching = this.filtered();
    if (this.action === 'update') {
      matching.forEach((row) => Object.assign(row, this.payload));
      return matching;
    }
    if (this.action === 'delete') {
      const ids = new Set(matching.map((row) => row.id));
      rows = rows.filter((row) => !ids.has(row.id));
      return matching;
    }
    return matching;
  }

  then(resolve: (value: { data: unknown[]; error: null }) => unknown) {
    return Promise.resolve({ data: this.execute(), error: null }).then(resolve);
  }

  async single() {
    const data = this.execute();
    return { data: data[0] ?? null, error: data[0] ? null : new Error('Not found') };
  }

  async maybeSingle() {
    const data = this.execute();
    return { data: data[0] ?? null, error: null };
  }
}

const supabase = { from: vi.fn(() => new QueryBuilder()) };

function request(path: string, method = 'GET', body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    ...(body === undefined ? {} : {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  });
}

describe('Platform Presets Route Handlers', () => {
  beforeEach(() => {
    rows = [];
    supabase.from.mockClear();
    authMock.requireUserWithRole.mockResolvedValue({
      user: { id: 'user-1' },
      role: 'marketer_full',
      supabase,
      unauthorized: null,
    });
  });

  it('returns 400 when platform is missing or invalid', async () => {
    const missing = await GET(request('/api/platform-presets'));
    const invalid = await GET(request('/api/platform-presets?platform=tiktok'));

    expect(missing.status).toBe(400);
    expect(invalid.status).toBe(400);
  });

  it('normalizes threads and auto-provisions system presets', async () => {
    rows = [{
      id: 'system-1', user_id: null, platform: 'thread', name: 'System', rules: 'Rules', is_default: true,
    }];

    const response = await GET(request('/api/platform-presets?platform=threads'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({ user_id: 'user-1', platform: 'thread', name: 'System' });
  });

  it('sorts defaults first and then by name', async () => {
    rows = [
      { id: 'b', user_id: 'user-1', platform: 'facebook', name: 'Beta', rules: 'B', is_default: false },
      { id: 'z', user_id: 'user-1', platform: 'facebook', name: 'Zulu', rules: 'Z', is_default: true },
      { id: 'a', user_id: 'user-1', platform: 'facebook', name: 'Alpha', rules: 'A', is_default: false },
    ];

    const response = await GET(request('/api/platform-presets?platform=facebook'));
    const body = await response.json();

    expect(body.data.map((item: { id: string }) => item.id)).toEqual(['z', 'a', 'b']);
  });

  it('returns 400 for invalid create input and creates a valid preset', async () => {
    const invalid = await POST(request('/api/platform-presets', 'POST', { platform: 'facebook' }));
    const valid = await POST(request('/api/platform-presets', 'POST', {
      platform: 'facebook', name: 'Custom', rules: 'Rules', is_default: true,
    }));
    const body = await valid.json();

    expect(invalid.status).toBe(400);
    expect(valid.status).toBe(200);
    expect(body.data).toMatchObject({ user_id: 'user-1', name: 'Custom', is_default: true });
  });

  it('protects system presets and presets owned by another user on update', async () => {
    rows = [
      { id: 'system', user_id: null, platform: 'facebook', name: 'System', rules: 'S', is_default: true },
      { id: 'other', user_id: 'user-2', platform: 'facebook', name: 'Other', rules: 'O', is_default: false },
    ];

    const system = await PUT(request('/api/platform-presets/system', 'PUT', { name: 'Changed' }), {
      params: Promise.resolve({ id: 'system' }),
    });
    const other = await PUT(request('/api/platform-presets/other', 'PUT', { name: 'Changed' }), {
      params: Promise.resolve({ id: 'other' }),
    });

    expect(system.status).toBe(403);
    expect(other.status).toBe(403);
  });

  it('updates an owned preset and validates update input', async () => {
    rows = [{
      id: 'owned', user_id: 'user-1', platform: 'facebook', name: 'Owned', rules: 'O', is_default: false,
    }];

    const invalid = await PUT(request('/api/platform-presets/owned', 'PUT', { name: '' }), {
      params: Promise.resolve({ id: 'owned' }),
    });
    const valid = await PUT(request('/api/platform-presets/owned', 'PUT', { name: 'Updated' }), {
      params: Promise.resolve({ id: 'owned' }),
    });
    const body = await valid.json();

    expect(invalid.status).toBe(400);
    expect(valid.status).toBe(200);
    expect(body.data.name).toBe('Updated');
  });

  it('returns 404 for a missing preset', async () => {
    const response = await PUT(request('/api/platform-presets/missing', 'PUT', { name: 'Changed' }), {
      params: Promise.resolve({ id: 'missing' }),
    });

    expect(response.status).toBe(404);
  });

  it('hard-deletes an owned preset', async () => {
    rows = [{
      id: 'owned', user_id: 'user-1', platform: 'facebook', name: 'Owned', rules: 'O', is_default: false,
    }];

    const response = await DELETE(request('/api/platform-presets/owned', 'DELETE'), {
      params: Promise.resolve({ id: 'owned' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(rows).toEqual([]);
  });
});
