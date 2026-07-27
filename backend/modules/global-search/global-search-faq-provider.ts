import { translations } from '@/lib/i18n/translations';
import type {
  FaqSearchResult,
  GlobalSearchFaqProvider,
  GlobalSearchLanguage,
} from './global-search-types';

const FAQ_CATEGORIES = ['harvesting', 'aiPrompts', 'scheduling', 'customization'] as const;

type FaqCategory = Record<string, unknown>;
type TranslationFaqs = {
  faq?: {
    categories?: Record<string, FaqCategory>;
  };
};

export class TranslationGlobalSearchFaqProvider implements GlobalSearchFaqProvider {
  search(query: string, language: GlobalSearchLanguage): FaqSearchResult[] {
    const translation = translations[language] as TranslationFaqs | undefined;
    const categories = translation?.faq?.categories;
    if (!categories) return [];

    const normalizedQuery = query.toLocaleLowerCase(language);
    const results: FaqSearchResult[] = [];

    for (const category of FAQ_CATEGORIES) {
      const categoryData = categories[category];
      if (!categoryData) continue;

      for (let index = 1; index <= 5; index += 1) {
        const question = categoryData[`q${index}`];
        const answer = categoryData[`a${index}`];
        if (typeof question !== 'string' || typeof answer !== 'string') continue;

        if (
          question.toLocaleLowerCase(language).includes(normalizedQuery)
          || answer.toLocaleLowerCase(language).includes(normalizedQuery)
        ) {
          results.push({
            key: `${category}_${index}`,
            category,
            question,
            answer,
          });
        }
      }
    }

    return results;
  }
}
