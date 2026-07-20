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

  async getUserSettings(userId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('email, email_on_success, email_on_failure, email_digest_enabled, email_digest_time')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw this.failure('getUserSettings', error);
    if (!data) {
      return {
        email_on_success: true,
        email_on_failure: true,
        email_digest_enabled: false,
        email_digest_time: '08:00',
      };
    }
    return {
      email: data.email,
      email_on_success: data.email_on_success ?? true,
      email_on_failure: data.email_on_failure ?? true,
      email_digest_enabled: data.email_digest_enabled ?? false,
      email_digest_time: data.email_digest_time ?? '08:00',
    };
  }

  async updateUserSettings(userId: string, settings: any) {
    const updateQuery = this.supabase
      .from('users')
      .update(settings)
      .eq('id', userId)
      .select('email_on_success, email_on_failure, email_digest_enabled, email_digest_time');

    let { data, error } = typeof (updateQuery as any).maybeSingle === 'function'
      ? await (updateQuery as any).maybeSingle()
      : await (updateQuery as any).single();

    if (!data && !error) {
      const upsertQuery = this.supabase
        .from('users')
        .upsert({ id: userId, ...settings }, { onConflict: 'id' })
        .select('email_on_success, email_on_failure, email_digest_enabled, email_digest_time');

      const upsertRes = typeof (upsertQuery as any).maybeSingle === 'function'
        ? await (upsertQuery as any).maybeSingle()
        : await (upsertQuery as any).single();

      data = upsertRes.data;
      error = upsertRes.error;
    }

    if (error) throw this.failure('updateUserSettings', error);
    return data as any;
  }

  async findUnsentEmailNotifications(userId: string) {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('email_sent', false)
      .in('type', ['post_success', 'post_failed'])
      .order('created_at', { ascending: true });
    if (error) throw this.failure('findUnsentEmailNotifications', error);
    return (data || []) as NotificationRecord[];
  }

  async markEmailsAsSent(notificationIds: string[]) {
    if (!notificationIds.length) return;
    const { error } = await this.supabase
      .from('notifications')
      .update({ email_sent: true })
      .in('id', notificationIds);
    if (error) throw this.failure('markEmailsAsSent', error);
  }

  async findUsersForDigest(currentHour: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data, error } = await this.supabase
      .from('users')
      .select('id, email, email_digest_time, last_digest_sent_at')
      .eq('email_digest_enabled', true)
      .eq('email_digest_time', currentHour);
    
    if (error) throw this.failure('findUsersForDigest', error);

    const users = (data || []).filter((u: any) => {
      if (!u.last_digest_sent_at) return true;
      const lastSent = new Date(u.last_digest_sent_at);
      return lastSent < todayStart;
    });

    return users.map((u: any) => ({ id: u.id, email: u.email, email_digest_time: u.email_digest_time }));
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
    email_sent: input.emailSent ?? false,
  };
}
