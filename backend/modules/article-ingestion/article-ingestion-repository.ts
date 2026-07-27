import type { SupabaseClient } from '@supabase/supabase-js';
import { ArticleIngestionRepositoryError } from './errors';
import type { ArticleIngestionRepository, ArticleRecord } from './article-ingestion-types';

export class SupabaseArticleIngestionRepository implements ArticleIngestionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findExact(url: string) {
    const { data, error } = await this.supabase.from('articles').select('*').eq('url', url).maybeSingle();
    if (error) throw new ArticleIngestionRepositoryError('findExact', error);
    return data as ArticleRecord | null;
  }

  async findPrefix(url: string) {
    const { data, error } = await this.supabase
      .from('articles').select('*').ilike('url', `${url}%`)
      .order('crawled_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw new ArticleIngestionRepositoryError('findPrefix', error);
    return data as ArticleRecord | null;
  }

  async update(id: string, input: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('articles').update(input).eq('id', id).select('id').single();
    if (error) throw new ArticleIngestionRepositoryError('update', error);
    return data as { id: string };
  }

  async insert(input: Record<string, unknown>) {
    const { data, error } = await this.supabase.from('articles').insert(input).select('id').single();
    if (error) throw new ArticleIngestionRepositoryError('insert', error);
    return data as { id: string };
  }
}
