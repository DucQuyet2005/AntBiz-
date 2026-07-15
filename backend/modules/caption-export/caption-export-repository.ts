import type { SupabaseClient } from '@supabase/supabase-js';
import { CaptionExportRepositoryError } from './caption-export-errors';
import type {
  CaptionExportFilters,
  CaptionExportRepository,
  CaptionExportRow,
} from './caption-export-types';

const CAPTION_EXPORT_SELECT = `
  id,
  platform,
  ai_content,
  edited_content,
  status,
  created_at,
  articles (url, title, category),
  prompts (name, content),
  users (email)
`;

export class SupabaseCaptionExportRepository implements CaptionExportRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async count(filters: CaptionExportFilters) {
    let query = this.supabase.from('captions').select('id', { count: 'exact', head: true });
    query = applyFilters(query, filters);
    const { count, error } = await query;
    if (error) throw new CaptionExportRepositoryError('count-captions', error);
    return count ?? 0;
  }

  async list(filters: CaptionExportFilters, limit: number) {
    let query = this.supabase
      .from('captions')
      .select(CAPTION_EXPORT_SELECT)
      .order('created_at', { ascending: false })
      .limit(limit);
    query = applyFilters(query, filters);
    const { data, error } = await query;
    if (error) throw new CaptionExportRepositoryError('list-captions', error);
    return (data ?? []) as CaptionExportRow[];
  }
}

export function buildCaptionSearchFilter(search: string) {
  const normalized = search.replace(/"/g, ' ').replace(/\s+/g, ' ').trim();
  const likeLiteral = normalized
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
  const pattern = `%${likeLiteral}%`.replace(/\\/g, '\\\\');
  const quoted = `"${pattern}"`;
  return `ai_content.ilike.${quoted},edited_content.ilike.${quoted}`;
}

function applyFilters<T extends {
  eq(column: string, value: unknown): T;
  or(filters: string): T;
  gte(column: string, value: string): T;
  lte(column: string, value: string): T;
}>(query: T, filters: CaptionExportFilters) {
  if (filters.platform) query = query.eq('platform', filters.platform);
  if (filters.search) query = query.or(buildCaptionSearchFilter(filters.search));
  if (filters.startDate) query = query.gte('created_at', filters.startDate);
  if (filters.endDate) query = query.lte('created_at', filters.endDate);
  return query;
}
