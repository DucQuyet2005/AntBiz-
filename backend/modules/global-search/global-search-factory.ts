import type { SupabaseClient } from '@supabase/supabase-js';
import { TranslationGlobalSearchFaqProvider } from './global-search-faq-provider';
import { GlobalSearchModule } from './global-search-module';
import { SupabaseGlobalSearchRepository } from './global-search-repository';

export function createGlobalSearchModule(supabase: SupabaseClient) {
  return new GlobalSearchModule(
    new SupabaseGlobalSearchRepository(supabase),
    new TranslationGlobalSearchFaqProvider()
  );
}
