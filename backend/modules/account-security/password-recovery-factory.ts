import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/admin';
import { AntBizPasswordRecoveryEmail } from './password-recovery-email';
import {
  SupabasePasswordRecoveryRequestGateway,
  SupabasePasswordRecoverySessionGateway,
} from './password-recovery-gateway';
import { PasswordRecoveryModule } from './password-recovery-module';

export function createPasswordRecoveryModule(supabase: SupabaseClient) {
  return new PasswordRecoveryModule(
    {
      generateRecoveryToken(email) {
        return new SupabasePasswordRecoveryRequestGateway(createAdminClient())
          .generateRecoveryToken(email);
      },
    },
    new SupabasePasswordRecoverySessionGateway(supabase),
    new AntBizPasswordRecoveryEmail()
  );
}
