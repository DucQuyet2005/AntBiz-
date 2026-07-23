import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const proxyRoute = readFileSync(
  resolve(process.cwd(), 'app/api/proxy/route.ts'),
  'utf8',
).replace(/\r\n/g, '\n');

describe('AI Creator proxy navigation interceptor', () => {
  it('intercepts embedded site navigation and data requests for proxying', () => {
    expect(proxyRoute).toContain("postMessage({ type: 'URL_CHANGE'");
    expect(proxyRoute).toContain('history.pushState = function');
    expect(proxyRoute).toContain('history.replaceState = function');
    expect(proxyRoute).toContain('window.fetch = function');
    expect(proxyRoute).toContain('XMLHttpRequest.prototype.open = function');
  });

  it('reports URL changes only when navigation state changes', () => {
    expect(proxyRoute).not.toContain('setInterval(report, 800)');
    expect(proxyRoute).toContain('_currentTarget = abs;');
    expect(proxyRoute).toContain('report();');
  });
});
