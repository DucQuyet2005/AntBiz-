import type { SupabaseClient } from '@supabase/supabase-js';
import { NotificationRepositoryError } from './errors';
import { buildKeywordOrFilter } from './notification-filters';
import type {
  CreateNotificationInput,
  NotificationFilter,
  NotificationRecord,
  NotificationRepository,
} from './notification-types';

export class SupabaseNotificationRepository implements NotificationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findUserRole(userId: string) {
    const { data, error } = await this.supabase
      .from('users').select('role').eq('id', userId).maybeSingle();
    if (error) throw this.failure('findUserRole', error);
    return data?.role || null;
  }

  async list(userId: string, page: number, limit: number, filter: NotificationFilter) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let query = this.supabase.from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filter.kind === 'types') query = query.in('type', filter.types);
    if (filter.kind === 'keywords') {
      query = query.eq('type', filter.type).or(buildKeywordOrFilter(filter.keywords));
    }
    if (filter.kind === 'schedule') {
      const keywords = buildKeywordOrFilter(filter.keywords);
      query = query.or(`type.eq.ab_test_complete,and(type.eq.info,or(${keywords}))`);
    }
    if (filter.kind === 'exclude-keywords') {
      query = query.eq('type', filter.type);
      for (const keyword of filter.keywords) {
        query = query.not('title', 'ilike', `%${keyword}%`)
          .not('message', 'ilike', `%${keyword}%`);
      }
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw this.failure('list', error);
    return { data: (data || []) as NotificationRecord[], count: count || 0 };
  }

  async insert(input: CreateNotificationInput) {
    const { data, error } = await this.supabase.from('notifications')
      .insert(toRow(input)).select().single();
    if (error) throw this.failure('insert', error);
    return data as NotificationRecord;
  }

  async insertMany(inputs: CreateNotificationInput[]) {
    const { data, error } = await this.supabase.from('notifications')
      .insert(inputs.map(toRow)).select();
    if (error) throw this.failure('insertMany', error);
    return (data || []) as NotificationRecord[];
  }

  async markRead(userId: string, notificationId: string) {
    const { data, error } = await this.supabase.from('notifications')
      .update({ is_read: true }).eq('id', notificationId).eq('user_id', userId)
      .select().maybeSingle();
    if (error) throw this.failure('markRead', error);
    return data as NotificationRecord | null;
  }

  async markAllRead(userId: string) {
    const { data, error } = await this.supabase.from('notifications')
      .update({ is_read: true }).eq('user_id', userId).eq('is_read', false).select();
    if (error) throw this.failure('markAllRead', error);
    return data?.length || 0;
  }

  private failure(operation: string, error: unknown) {
    return new NotificationRepositoryError(operation, error);
  }
}

function toRow(input: CreateNotificationInput) {
  return {
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    metadata: input.metadata || {},
  };
}
