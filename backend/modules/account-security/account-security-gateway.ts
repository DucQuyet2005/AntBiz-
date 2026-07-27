import type { SupabaseClient } from '@supabase/supabase-js';
import { AccountSecurityGatewayError } from './account-security-errors';
import type { AccountSecurityGateway } from './account-security-types';

export class SupabaseAccountSecurityGateway implements AccountSecurityGateway {
  constructor(private readonly supabase: SupabaseClient) {}

  async verifyCurrentPassword(email: string, currentPassword: string) {
    const { error } = await this.supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    return !error;
  }

  async updatePassword(newPassword: string) {
    const { error } = await this.supabase.auth.updateUser({ password: newPassword });
    if (error) throw new AccountSecurityGatewayError('updatePassword', error);
  }

  async revokeAllSessions() {
    const { error } = await this.supabase.auth.signOut({ scope: 'global' });
    if (error) throw new AccountSecurityGatewayError('revokeAllSessions', error);
  }
}
