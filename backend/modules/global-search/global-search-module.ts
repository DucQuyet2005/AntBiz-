import { parseGlobalSearchInput } from './global-search-schemas';
import type {
  GlobalSearchFaqProvider,
  GlobalSearchRepository,
  GlobalSearchResult,
  RawGlobalSearchInput,
} from './global-search-types';

export class GlobalSearchModule {
  constructor(
    private readonly repository: GlobalSearchRepository,
    private readonly faqProvider: GlobalSearchFaqProvider
  ) {}

  async search(rawInput: RawGlobalSearchInput): Promise<GlobalSearchResult> {
    const input = parseGlobalSearchInput(rawInput);
    const faqs = this.faqProvider.search(input.query, input.language);

    if (input.actor.role === 'admin') {
      const records = await this.repository.searchAdmin(input.query);
      return { ...records, faqs };
    }

    const records = await this.repository.searchMarketer(input.query, input.actor.id);
    return { ...records, faqs };
  }
}
