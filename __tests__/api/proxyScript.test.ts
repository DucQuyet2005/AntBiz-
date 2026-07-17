import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const proxyRoute = readFileSync(
  resolve(process.cwd(), 'app/api/proxy/route.ts'),
  'utf8',
).replace(/\r\n/g, '\n');

describe('AI Creator proxy navigation interceptor', () => {
  it('does not proxy the embedded site application data requests', () => {
    expect(proxyRoute).not.toContain('window.fetch = function');
    expect(proxyRoute).not.toContain('XMLHttpRequest.prototype.open = function');
  });

  it('reports URL changes only when navigation state changes', () => {
    expect(proxyRoute).not.toContain('setInterval(report, 800)');
    expect(proxyRoute).toContain('_currentTarget = abs;\n          report();');
  });
});
