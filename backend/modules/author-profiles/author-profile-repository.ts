import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthorProfileRepositoryError } from './errors';
import type { AuthorProfileRecord, AuthorProfileRepository } from './author-profile-types';

export class SupabaseAuthorProfileRepository implements AuthorProfileRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listByOwner(ownerId: string) {
    const { data, error } = await this.supabase
      .from('author_profiles').select('*').eq('user_id', ownerId)
      .order('created_at', { ascending: false });
    if (error) throw new AuthorProfileRepositoryError('listByOwner', error);
    return (data || []) as AuthorProfileRecord[];
  }

  async findById(id: string) {
    const { data, error } = await this.supabase
      .from('author_profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw new AuthorProfileRepositoryError('findById', error);
    return data as AuthorProfileRecord | null;
  }

  async findNameConflict(ownerId: string, name: string, excludeId?: string) {
    let query = this.supabase
      .from('author_profiles').select('*').eq('user_id', ownerId).eq('name', name);
    if (excludeId) query = query.neq('id', excludeId);
    const { data, error } = await query.maybeSingle();
    if (error) throw new AuthorProfileRepositoryError('findNameConflict', error);
    return data as AuthorProfileRecord | null;
  }

  async insert(input: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('author_profiles').insert(input).select().single();
    if (error) throw new AuthorProfileRepositoryError('insert', error);
    return data as AuthorProfileRecord;
  }

  async update(id: string, input: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('author_profiles').update(input).eq('id', id).select().single();
    if (error) throw new AuthorProfileRepositoryError('update', error);
    return data as AuthorProfileRecord;
  }

  async delete(id: string) {
    const { error } = await this.supabase.from('author_profiles').delete().eq('id', id);
    if (error) throw new AuthorProfileRepositoryError('delete', error);
  }
}
