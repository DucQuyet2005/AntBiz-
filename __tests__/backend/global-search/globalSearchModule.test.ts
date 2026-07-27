import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalSearchError } from '@/backend/modules/global-search/global-search-errors';
import { TranslationGlobalSearchFaqProvider } from '@/backend/modules/global-search/global-search-faq-provider';
import { GlobalSearchModule } from '@/backend/modules/global-search/global-search-module';
import { parseGlobalSearchInput } from '@/backend/modules/global-search/global-search-schemas';
import type {
  GlobalSearchFaqProvider,
  GlobalSearchRepository,
} from '@/backend/modules/global-search/global-search-types';

describe('GlobalSearchModule', () => {
  let repository: GlobalSearchRepository;
  let faqProvider: GlobalSearchFaqProvider;
  let searchModule: GlobalSearchModule;

  beforeEach(() => {
    repository = {
      searchAdmin: vi.fn().mockResolvedValue({ users: [], auditLogs: [] }),
      searchMarketer: vi.fn().mockResolvedValue({ articles: [], captions: [], prompts: [] }),
    };
    faqProvider = { search: vi.fn().mockReturnValue([]) };
    searchModule = new GlobalSearchModule(repository, faqProvider);
  });

  it('normalizes input and dispatches administrators to the admin projection', async () => {
    vi.mocked(repository.searchAdmin).mockResolvedValue({
      users: [{ id: 'user-1' }],
      auditLogs: [{ id: 'log-1' }],
    });
    vi.mocked(faqProvider.search).mockReturnValue([
      { key: 'faq-1', category: 'harvesting', question: 'Question', answer: 'Answer' },
    ]);

    await expect(searchModule.search({
      query: '  account  ',
      language: 'unsupported',
      actor: { id: 'admin-1', role: 'admin' },
    })).resolves.toEqual({
      users: [{ id: 'user-1' }],
      auditLogs: [{ id: 'log-1' }],
      faqs: [{ key: 'faq-1', category: 'harvesting', question: 'Question', answer: 'Answer' }],
    });
    expect(repository.searchAdmin).toHaveBeenCalledWith('account');
    expect(repository.searchMarketer).not.toHaveBeenCalled();
    expect(faqProvider.search).toHaveBeenCalledWith('account', 'vi');
  });

  it.each(['marketer_full', 'marketer_content'] as const)(
    'dispatches %s to the marketer projection with prompt ownership identity',
    async (role) => {
      await searchModule.search({
        query: 'campaign',
        language: 'en',
        actor: { id: 'marketer-1', role },
      });

      expect(repository.searchMarketer).toHaveBeenCalledWith('campaign', 'marketer-1');
      expect(repository.searchAdmin).not.toHaveBeenCalled();
      expect(faqProvider.search).toHaveBeenCalledWith('campaign', 'en');
    }
  );
});

describe('parseGlobalSearchInput', () => {
  const actor = { id: 'user-1', role: 'marketer_full' as const };

  it.each([undefined, null, '', '   '])('rejects an empty query (%s)', (query) => {
    expect(() => parseGlobalSearchInput({ query, actor })).toThrowError(GlobalSearchError);
  });

  it('rejects queries longer than 200 characters', () => {
    expect(() => parseGlobalSearchInput({ query: 'x'.repeat(201), actor })).toThrowError(
      /200/
    );
  });

  it('allows a one-character query and preserves supported English', () => {
    expect(parseGlobalSearchInput({ query: ' x ', language: 'en', actor })).toEqual({
      query: 'x',
      language: 'en',
      actor,
    });
  });

  it('rejects an unsupported runtime role', () => {
    expect(() => parseGlobalSearchInput({
      query: 'test',
      actor: { id: 'user-1', role: 'viewer' as never },
    })).toThrowError(expect.objectContaining({ code: 'FORBIDDEN', status: 403 }));
  });
});

describe('TranslationGlobalSearchFaqProvider', () => {
  const provider = new TranslationGlobalSearchFaqProvider();

  it('finds Vietnamese FAQ content in its stable category order', () => {
    const results = provider.search('gocnhinmoi', 'vi');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toMatchObject({ key: 'harvesting_1', category: 'harvesting' });
  });

  it('finds English FAQ content case-insensitively', () => {
    const results = provider.search('INGEST CONTENT', 'en');
    expect(results.some((result) => result.key === 'harvesting_1')).toBe(true);
  });
});
