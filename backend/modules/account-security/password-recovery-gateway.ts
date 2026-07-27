import type { SupabaseClient } from '@supabase/supabase-js';
import { PasswordRecoveryGatewayError } from './password-recovery-errors';
import type {
  PasswordRecoveryRequestGateway,
  PasswordRecoverySessionGateway,
} from './password-recovery-types';

type AdminAuthClient = {
  auth: {
    admin: {
      generateLink(input: { type: 'recovery'; email: string }): Promise<{
        data: { properties?: { hashed_token?: string | null } | null } | null;
        error: unknown;
      }>;
    };
  };
};

export class SupabasePasswordRecoveryRequestGateway
implements PasswordRecoveryRequestGateway {
  constructor(private readonly adminClient: AdminAuthClient) {}

  async generateRecoveryToken(email: string) {
    const { data, error } = await this.adminClient.auth.admin.generateLink({
      type: 'recovery', email,
    });
    if (error) throw new PasswordRecoveryGatewayError('generateRecoveryToken', error);
    return data?.properties?.hashed_token || null;
  }
}

export class SupabasePasswordRecoverySessionGateway
implements PasswordRecoverySessionGateway {
  constructor(private readonly supabase: SupabaseClient) {}

  async verifyRecoveryToken(token: string) {
    const { error } = await this.supabase.auth.verifyOtp({
      type: 'recovery', token_hash: token,
    });
    return !error;
  }

  async updateRecoveredPassword(password: string) {
    const { error } = await this.supabase.auth.updateUser({ password });
    if (error) throw new PasswordRecoveryGatewayError('updateRecoveredPassword', error);
  }

  async revokeAllSessions() {
    const { error } = await this.supabase.auth.signOut({ scope: 'global' });
    if (error) throw new PasswordRecoveryGatewayError('revokeAllSessions', error);
  }
}
