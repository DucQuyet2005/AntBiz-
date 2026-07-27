import type { SupabaseClient } from '@supabase/supabase-js';
import { ProductionAccountSecurityEffects } from './account-security-effects';
import { SupabaseAccountSecurityGateway } from './account-security-gateway';
import { AccountSecurityModule } from './account-security-module';

export function createAccountSecurityModule(supabase: SupabaseClient) {
  return new AccountSecurityModule(
    new SupabaseAccountSecurityGateway(supabase),
    new ProductionAccountSecurityEffects()
  );
}
