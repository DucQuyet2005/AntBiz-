import type { SupabaseClient } from '@supabase/supabase-js';
import { SocialAccountConnectionsError } from './social-account-connections-errors';
import { toStoredPlatform } from './social-account-connections-schemas';
import type {
  LinkedAccountCandidate,
  LinkedAccountPublicRecord,
  LinkedAccountRepository,
  StoredConnectionPlatform,
} from './social-account-connections-types';

const PUBLIC_SELECTION = 'id, platform, account_id, account_name, expires_at, created_at, updated_at';

export class SupabaseLinkedAccountRepository implements LinkedAccountRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(userId: string): Promise<LinkedAccountPublicRecord[]> {
    const { data, error } = await this.supabase
      .from('linked_accounts')
      .select(PUBLIC_SELECTION)
      .eq('user_id', userId);
    if (error) throw repositoryFailure('list', error);
    return (data || []) as LinkedAccountPublicRecord[];
  }

  async upsert(userId: string, candidate: LinkedAccountCandidate) {
    try {
      const { error } = await this.supabase.from('linked_accounts').upsert({
        user_id: userId,
        platform: toStoredPlatform(candidate.platform),
        account_id: candidate.accountId,
        account_name: candidate.accountName,
        access_token: candidate.accessToken,
        refresh_token: candidate.refreshToken ?? null,
        expires_at: candidate.expiresAt ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,platform,account_id' });
      return !error;
    } catch {
      return false;
    }
  }

  async disconnect(userId: string, platform: StoredConnectionPlatform) {
    const { error } = await this.supabase
      .from('linked_accounts')
      .delete()
      .eq('user_id', userId)
      .eq('platform', platform);
    if (error) throw repositoryFailure('disconnect', error);
  }

  async findAccessToken(userId: string, platform: StoredConnectionPlatform): Promise<{ accessToken: string; refreshToken?: string | null } | null> {
    const { data, error } = await this.supabase
      .from('linked_accounts')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .eq('platform', platform)
      .maybeSingle();
    if (error || !data) return null;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  async updateToken(userId: string, platform: StoredConnectionPlatform, accessToken: string, expiresAt: string | null): Promise<boolean> {
    const { error } = await this.supabase
      .from('linked_accounts')
      .update({
        access_token: accessToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('platform', platform);
    return !error;
  }
}

function repositoryFailure(operation: string, cause: unknown) {
  return new SocialAccountConnectionsError(
    'connection_failed',
    500,
    'Không thể xử lý tài khoản liên kết lúc này',
    {
      cause: cause instanceof Error ? new Error(cause.name) : undefined,
      context: { operation },
    }
  );
}
