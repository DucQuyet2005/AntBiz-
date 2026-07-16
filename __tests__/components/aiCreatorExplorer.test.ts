import { describe, expect, it } from 'vitest';
import { getExplorerSourceCards, getExplorerUrlForSource } from '@/lib/utils/aiCreatorExplorer';

describe('AI Creator explorer source cards', () => {
  it('returns Vietnamese labels and default URL for the first card', () => {
    const cards = getExplorerSourceCards('vi');

    expect(cards[0]).toMatchObject({
      id: 'gocnhinmoi',
      label: 'Góc Nhìn Mới',
      baseUrl: 'https://gocnhinmoi.com.vn/'
    });
  });

  it('maps known source ids to their explorer URLs', () => {
    expect(getExplorerUrlForSource('dantri')).toBe('https://dantri.com.vn/');
    expect(getExplorerUrlForSource('tuoitre')).toBe('https://tuoitre.vn/');
  });
});
