import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const step2Source = readFileSync(
  resolve(process.cwd(), 'components/views/creator-flow/Step2Article.tsx'),
  'utf8',
);

describe('AI Creator source browser', () => {
  it('uses an isolated iframe without runtime mock articles', () => {
    expect(step2Source).toContain('sandbox="allow-scripts allow-forms allow-popups"');
    expect(step2Source).not.toContain('allow-same-origin');
    expect(step2Source).not.toContain('MOCK_SITE_ARTICLES');
  });

  it('accepts navigation messages only from the active iframe', () => {
    expect(step2Source).toContain(
      'event.source !== iframeRef.current?.contentWindow',
    );
    expect(step2Source).toMatch(
      /normalizeCreatorSourceUrl\(activeBrowserSite,\s*event\.data\.url\)/,
    );
  });
});
