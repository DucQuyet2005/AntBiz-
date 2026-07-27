import { describe, expect, it } from 'vitest';
import { SafeCaptionCsvSerializer } from '@/backend/modules/caption-export/caption-csv-serializer';

describe('SafeCaptionCsvSerializer', () => {
  const serializer = new SafeCaptionCsvSerializer();

  it('preserves the established BOM, columns, relations, quotes, commas, and newlines', () => {
    const csv = serializer.serialize([{
      id: 'caption-1',
      platform: 'facebook',
      ai_content: 'Line one\nLine "two"',
      edited_content: 'Edited, content',
      status: 'published',
      created_at: '2026-07-15T00:00:00.000Z',
      articles: [{ url: 'https://example.com', title: 'Article', category: 'Tech' }],
      prompts: { name: 'Prompt', content: 'Instruction' },
      users: { email: 'user@example.com' },
    }]);

    expect(csv.startsWith('\ufeff')).toBe(true);
    expect(csv.split('\n')[0]).toContain(
      'ID,Article URL,Article Title,Category,Platform,Prompt Name,Prompt Content,AI Content,Edited Content,Status,Created By,Created At'
    );
    expect(csv).toContain('"Line one\nLine ""two"""');
    expect(csv).toContain('"Edited, content"');
    expect(csv).toContain('"https://example.com"');
  });

  it('uses empty strings for missing optional values', () => {
    const row = serializer.serialize([{
      id: 'caption-2',
      platform: 'threads',
      status: 'draft',
      created_at: '2026-07-15T00:00:00.000Z',
    }]).split('\n')[1];
    expect(row).toBe(
      '"caption-2","","","","threads","","","","","draft","","2026-07-15T00:00:00.000Z"'
    );
  });

  it.each(['=1+1', '+SUM(A1)', '-2+3', '@cmd', '\tformula', '\rformula'])(
    'neutralizes spreadsheet formula prefix %j',
    (dangerous) => {
      const csv = serializer.serialize([{ id: 'caption-3', ai_content: dangerous }]);
      expect(csv).toContain(`"'${dangerous}"`);
    }
  );

  it('leaves ordinary text unchanged', () => {
    expect(serializer.serialize([{ id: 'caption-4', ai_content: 'ordinary' }])).toContain(
      '"ordinary"'
    );
  });
});
