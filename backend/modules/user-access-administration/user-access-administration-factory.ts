import type { SupabaseClient } from '@supabase/supabase-js';
import { ProductionUserAccessEffects } from './user-access-effects';
import { UserAccessAdministrationModule } from './user-access-administration-module';
import { SupabaseUserAccessAdministrationRepository } from './user-access-administration-repository';

export function createUserAccessAdministrationModule(supabase: SupabaseClient) {
  return new UserAccessAdministrationModule(
    new SupabaseUserAccessAdministrationRepository(supabase),
    new ProductionUserAccessEffects(supabase)
  );
}
