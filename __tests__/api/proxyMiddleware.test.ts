import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Supabase to prevent execution of auth logic
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  })),
}));

import { proxy } from '../../proxy';

describe('Proxy Middleware routing and rewrite contract', () => {
  it('rewrites requests with target url in query parameters (Case A)', async () => {
    const req = new NextRequest(
      'http://localhost:3000/luis-de-la-fuente-nguoi-lam-vuon-vi-dai-82891?url=https%3A%2F%2Fgocnhinmoi.com.vn%2Fluis-de-la-fuente-nguoi-lam-vuon-vi-dai-82891'
    );

    const res = await proxy(req);
    expect(res).toBeDefined();
    
    // It should perform a rewrite (which returns a response with rewrite destination header)
    expect(res!.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost:3000/api/proxy?url=https%3A%2F%2Fgocnhinmoi.com.vn%2Fluis-de-la-fuente-nguoi-lam-vuon-vi-dai-82891'
    );
    
    // Cookie should be set correctly
    const cookie = res!.cookies.get('active_proxy_origin');
    expect(cookie).toBeDefined();
    expect(cookie!.value).toBe('https://gocnhinmoi.com.vn');
  });

  it('rewrites same-origin requests using target url in Referer header (Case B)', async () => {
    const req = new NextRequest(
      'http://localhost:3000/hashtag/xa-hoi-so?_rsc=1',
      {
        headers: {
          referer: 'http://localhost:3000/api/proxy?url=https%3A%2F%2Fgocnhinmoi.com.vn%2F',
        },
      }
    );

    const res = await proxy(req);
    expect(res).toBeDefined();
    expect(res!.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost:3000/api/proxy?url=https%3A%2F%2Fgocnhinmoi.com.vn%2Fhashtag%2Fxa-hoi-so%3F_rsc%3D1'
    );

    const cookie = res!.cookies.get('active_proxy_origin');
    expect(cookie).toBeDefined();
    expect(cookie!.value).toBe('https://gocnhinmoi.com.vn');
  });

  it('rewrites same-origin requests using active_proxy_origin cookie as fallback (Case C)', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/comments',
      {
        headers: {
          referer: 'http://localhost:3000/luis-de-la-fuente-nguoi-lam-vuon-vi-dai-82891',
          cookie: 'active_proxy_origin=https://gocnhinmoi.com.vn',
        },
      }
    );

    const res = await proxy(req);
    expect(res).toBeDefined();
    expect(res!.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost:3000/api/proxy?url=https%3A%2F%2Fgocnhinmoi.com.vn%2Fapi%2Fcomments'
    );

    const cookie = res!.cookies.get('active_proxy_origin');
    expect(cookie).toBeDefined();
    expect(cookie!.value).toBe('https://gocnhinmoi.com.vn');
  });

  it('ignores legitimate AntBiz routes (such as /overview)', async () => {
    const req = new NextRequest('http://localhost:3000/overview');

    const res = await proxy(req);
    // Since it's a legitimate route and user is not authenticated, it should fall through
    // to Supabase auth check (which returns a redirect response to '/' because user is null)
    expect(res).toBeDefined();
    expect(res!.headers.get('location')).toBe('http://localhost:3000/');
  });
});
