import type { SupabaseClient } from '@supabase/supabase-js';
import { ScheduledPublishingRepositoryError } from './errors';
import type {
  CalendarFilters,
  CaptionSummary,
  LinkedAccountRecord,
  PublishingPlatform,
  ScheduledPostRecord,
  ScheduledPublishingRepository,
} from './scheduled-publishing-types';

const listSelection = '*, captions(id, ai_content, edited_content, platform, articles(id, title, category, description)), users:created_by(id, email)';
const runnerSelection = '*, captions(id, platform, ai_content, edited_content, articles(id, title)), users:created_by(id, email)';

export class SupabaseScheduledPublishingRepository implements ScheduledPublishingRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(filters?: { triggerSource?: string; limit?: number; creatorId?: string }) {
    let query = this.supabase.from('scheduled_posts').select(listSelection);

    if (filters?.triggerSource) {
      query = query.eq('trigger_source', filters.triggerSource);
    }
    if (filters?.creatorId) {
      query = query.eq('created_by', filters.creatorId);
    }

    if (filters?.triggerSource) {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('scheduled_at', { ascending: true });
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw this.failure('list', error);
    return (data || []) as ScheduledPostRecord[];
  }

  async listPaginated(
    page: number,
    limit: number,
    filters?: { platforms?: string[]; status?: string; sortOrder?: 'asc' | 'desc'; creatorId?: string }
  ) {
    let query = this.supabase
      .from('scheduled_posts')
      .select(listSelection, { count: 'exact' });

    if (filters?.platforms?.length) {
      query = query.in('platform', filters.platforms);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.creatorId) {
      query = query.eq('created_by', filters.creatorId);
    }

    const sortOrder = filters?.sortOrder || 'asc';
    query = query.order('scheduled_at', { ascending: sortOrder === 'asc' });

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw this.failure('listPaginated', error);
    return { data: (data || []) as ScheduledPostRecord[], count: count || 0 };
  }

  async findCaption(id: string) {
    const { data, error } = await this.supabase
      .from('captions').select('*, articles(title)').eq('id', id).maybeSingle();
    if (error) throw this.failure('findCaption', error);
    return data as CaptionSummary | null;
  }

  async findPendingByCaption(captionId: string) {
    const { data, error } = await this.supabase
      .from('scheduled_posts').select('*').eq('caption_id', captionId)
      .eq('status', 'pending').maybeSingle();
    if (error) throw this.failure('findPendingByCaption', error);
    return data as ScheduledPostRecord | null;
  }

  async insert(input: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('scheduled_posts').insert(input).select().single();
    if (error) throw this.failure('insert', error);
    return data as ScheduledPostRecord;
  }

  async update(id: string, input: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('scheduled_posts').update(input).eq('id', id).select().single();
    if (error) throw this.failure('update', error);
    return data as ScheduledPostRecord;
  }

  async findById(id: string) {
    const { data, error } = await this.supabase
      .from('scheduled_posts').select('*').eq('id', id).maybeSingle();
    if (error) throw this.failure('findById', error);
    return data as ScheduledPostRecord | null;
  }

  async findByIds(ids: string[]) {
    const { data, error } = await this.supabase
      .from('scheduled_posts').select('*').in('id', ids);
    if (error) throw this.failure('findByIds', error);
    return (data || []) as ScheduledPostRecord[];
  }

  async updatePending(id: string, input: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('scheduled_posts').update(input).eq('id', id).eq('status', 'pending')
      .select('*, captions(id, articles(title))').maybeSingle();
    if (error) throw this.failure('updatePending', error);
    return data as ScheduledPostRecord | null;
  }

  async updatePendingMany(ids: string[], input: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('scheduled_posts').update(input).in('id', ids).eq('status', 'pending')
      .select('*, captions(id, articles(title))');
    if (error) throw this.failure('updatePendingMany', error);
    return (data || []) as ScheduledPostRecord[];
  }

  async updateCaptionStatus(id: string, status: string) {
    const { error } = await this.supabase.from('captions').update({ status }).eq('id', id);
    if (error) throw this.failure('updateCaptionStatus', error);
  }

  async listCalendar(filters: CalendarFilters) {
    let query = this.supabase.from('scheduled_posts').select(listSelection);
    if (filters.creatorId) query = query.eq('created_by', filters.creatorId);
    if (filters.from) query = query.gte('scheduled_at', filters.from);
    if (filters.to) query = query.lte('scheduled_at', filters.to);
    if (filters.platforms?.length) query = query.in('platform', filters.platforms);
    const { data, error } = await query.order('scheduled_at', { ascending: true });
    if (error) throw this.failure('listCalendar', error);
    return (data || []) as ScheduledPostRecord[];
  }

  async findDue(nowIso: string) {
    const { data, error } = await this.supabase.from('scheduled_posts')
      .select(runnerSelection).eq('status', 'pending').lte('scheduled_at', nowIso);
    if (error) throw this.failure('findDue', error);
    return (data || []) as ScheduledPostRecord[];
  }

  async claimPending(id: string, nowIso: string) {
    const { data, error } = await this.supabase.from('scheduled_posts')
      .update({ status: 'posted', posted_at: nowIso, updated_at: nowIso })
      .eq('id', id).eq('status', 'pending').select('id');
    if (error) throw this.failure('claimPending', error);
    return Boolean(data?.length);
  }

  async findLinkedAccount(userId: string, platform: PublishingPlatform) {
    const { data, error } = await this.supabase.from('linked_accounts')
      .select('access_token, account_id').eq('user_id', userId)
      .eq('platform', platform).maybeSingle();
    if (error) throw this.failure('findLinkedAccount', error);
    return data as LinkedAccountRecord | null;
  }

  async markPosted(id: string, input: Record<string, unknown>) {
    const { error } = await this.supabase.from('scheduled_posts').update(input).eq('id', id);
    if (error) throw this.failure('markPosted', error);
  }

  async markFailed(id: string, input: Record<string, unknown>) {
    const { error } = await this.supabase.from('scheduled_posts').update(input).eq('id', id);
    if (error) throw this.failure('markFailed', error);
  }

  private failure(operation: string, error: unknown) {
    return new ScheduledPublishingRepositoryError(operation, error);
  }
}
