import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/admin';
import { ProcessEnvironmentCredentialAdapter } from './environment-credential-adapter';
import { GeminiCapacityModule } from './gemini-capacity-module';
import { SupabaseGeminiCapacityRepository } from './gemini-capacity-repository';
import { UnavailableGeminiCapacityRepository } from './unavailable-repository';
import type { GeminiCapacityExecutor } from './gemini-capacity-types';

export function createAdminGeminiCapacityModule(supabase: SupabaseClient) {
  return new GeminiCapacityModule(
    new SupabaseGeminiCapacityRepository(supabase),
    new ProcessEnvironmentCredentialAdapter()
  );
}

export function createRuntimeGeminiCapacityModule() {
  try {
    return new GeminiCapacityModule(
      new SupabaseGeminiCapacityRepository(createAdminClient()),
      new ProcessEnvironmentCredentialAdapter()
    );
  } catch (error) {
    return new GeminiCapacityModule(
      new UnavailableGeminiCapacityRepository(error),
      new ProcessEnvironmentCredentialAdapter()
    );
  }
}

export const executeWithGeminiCapacity: GeminiCapacityExecutor = (workload, runner) =>
  createRuntimeGeminiCapacityModule().execute(workload, runner);
