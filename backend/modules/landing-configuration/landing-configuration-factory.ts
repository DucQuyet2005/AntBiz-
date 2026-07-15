import type { SupabaseClient } from '@supabase/supabase-js';
import { LandingConfigurationModule } from './landing-configuration-module';
import { SupabaseLandingConfigurationRepository } from './landing-configuration-repository';

export function createLandingConfigurationModule(supabase: SupabaseClient) {
  return new LandingConfigurationModule(
    new SupabaseLandingConfigurationRepository(supabase)
  );
}
