import type { SupabaseClient } from '@supabase/supabase-js';
import { UserAccessAdministrationRepositoryError } from './user-access-administration-errors';
import type {
  UserAccessAdministrationRepository,
  UserAccessRecord,
  UserAccessState,
  UserListInput,
} from './user-access-administration-types';

export class SupabaseUserAccessAdministrationRepository
implements UserAccessAdministrationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(input: UserListInput) {
    const from = (input.page - 1) * input.limit;
    const to = from + input.limit - 1;
    let query = this.supabase
      .from('users')
      .select('id, email, role, status, created_at, last_login_at', { count: 'exact' });

    if (input.search) query = query.ilike('email', `%${input.search}%`);
    if (input.role) query = query.eq('role', input.role);
    if (input.status) query = query.eq('status', input.status);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw this.failure('list', error);
    return { data: (data || []) as UserAccessRecord[], count: count || 0 };
  }

  async findById(userId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, email, role, status, locked_reason, locked_at, locked_by')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw this.failure('findById', error);
    return data as UserAccessState | null;
  }

  async updateRole(userId: string, role: UserAccessState['role']) {
    const { error } = await this.supabase.from('users').update({ role }).eq('id', userId);
    if (error) throw this.failure('updateRole', error);
  }

  async updateStatus(
    userId: string,
    update: Parameters<UserAccessAdministrationRepository['updateStatus']>[1]
  ) {
    const { error } = await this.supabase.from('users').update({
      status: update.status,
      locked_reason: update.lockedReason,
      locked_at: update.lockedAt,
      locked_by: update.lockedBy,
    }).eq('id', userId);
    if (error) throw this.failure('updateStatus', error);
  }

  private failure(operation: string, error: unknown) {
    return new UserAccessAdministrationRepositoryError(operation, error);
  }
}
