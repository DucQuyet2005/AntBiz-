import type { SupabaseClient } from '@supabase/supabase-js';
import { GlobalSearchRepositoryError } from './global-search-errors';
import type {
  AdminSearchRecords,
  GlobalSearchRepository,
  MarketerSearchRecords,
} from './global-search-types';

const RESULT_LIMIT = 20;

export class SupabaseGlobalSearchRepository implements GlobalSearchRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async searchAdmin(query: string): Promise<AdminSearchRecords> {
    const pattern = buildLiteralContainsPattern(query);
    const [usersResult, auditLogsResult] = await Promise.all([
      this.supabase
        .from('users')
        .select('id, email, role, status, created_at')
        .ilike('email', pattern)
        .order('created_at', { ascending: false })
        .limit(RESULT_LIMIT),
      this.supabase
        .from('audit_logs')
        .select('id, action, created_at, actor_id, actor:users!audit_logs_actor_id_fkey(email)')
        .ilike('action', pattern)
        .order('created_at', { ascending: false })
        .limit(RESULT_LIMIT),
    ]);

    if (usersResult.error) {
      throw new GlobalSearchRepositoryError('search-users', usersResult.error);
    }
    if (auditLogsResult.error) {
      throw new GlobalSearchRepositoryError('search-audit-logs', auditLogsResult.error);
    }

    return {
      users: usersResult.data ?? [],
      auditLogs: auditLogsResult.data ?? [],
    };
  }

  async searchMarketer(query: string, actorId: string): Promise<MarketerSearchRecords> {
    if (query.includes('"')) {
      return this.searchMarketerWithDirectFilters(query, actorId);
    }

    const pattern = quotePostgrestValue(buildLiteralContainsPattern(query));
    const [articlesResult, captionsResult, promptsResult] = await Promise.all([
      this.supabase
        .from('articles')
        .select('id, title, description, crawled_at')
        .or(buildOrFilter(['title', 'description', 'full_text'], pattern))
        .order('created_at', { ascending: false })
        .limit(RESULT_LIMIT),
      this.supabase
        .from('captions')
        .select('id, platform, ai_content, edited_content, article_id, articles(id, title)')
        .or(buildOrFilter(['edited_content', 'ai_content'], pattern))
        .order('created_at', { ascending: false })
        .limit(RESULT_LIMIT),
      this.supabase
        .from('prompts')
        .select('id, name, content, platform, tags, created_by')
        .eq('is_deleted', false)
        .eq('created_by', actorId)
        .or(buildOrFilter(['name', 'content'], pattern))
        .order('created_at', { ascending: false })
        .limit(RESULT_LIMIT),
    ]);

    if (articlesResult.error) {
      throw new GlobalSearchRepositoryError('search-articles', articlesResult.error);
    }
    if (captionsResult.error) {
      throw new GlobalSearchRepositoryError('search-captions', captionsResult.error);
    }
    if (promptsResult.error) {
      throw new GlobalSearchRepositoryError('search-prompts', promptsResult.error);
    }

    return {
      articles: articlesResult.data ?? [],
      captions: captionsResult.data ?? [],
      prompts: promptsResult.data ?? [],
    };
  }

  private async searchMarketerWithDirectFilters(
    query: string,
    actorId: string
  ): Promise<MarketerSearchRecords> {
    const pattern = buildLiteralContainsPattern(query);
    const articleQueries = ['title', 'description', 'full_text'].map((column) =>
      this.supabase
        .from('articles')
        .select('id, title, description, crawled_at, created_at')
        .ilike(column, pattern)
        .order('created_at', { ascending: false })
        .limit(RESULT_LIMIT)
    );
    const captionQueries = ['edited_content', 'ai_content'].map((column) =>
      this.supabase
        .from('captions')
        .select('id, platform, ai_content, edited_content, article_id, created_at, articles(id, title)')
        .ilike(column, pattern)
        .order('created_at', { ascending: false })
        .limit(RESULT_LIMIT)
    );
    const promptQueries = ['name', 'content'].map((column) =>
      this.supabase
        .from('prompts')
        .select('id, name, content, platform, tags, created_by, created_at')
        .eq('is_deleted', false)
        .eq('created_by', actorId)
        .ilike(column, pattern)
        .order('created_at', { ascending: false })
        .limit(RESULT_LIMIT)
    );

    const results = await Promise.all([
      ...articleQueries,
      ...captionQueries,
      ...promptQueries,
    ]);
    const articleResults = results.slice(0, articleQueries.length);
    const captionResults = results.slice(
      articleQueries.length,
      articleQueries.length + captionQueries.length
    );
    const promptResults = results.slice(articleQueries.length + captionQueries.length);

    throwForFirstError(articleResults, 'search-articles');
    throwForFirstError(captionResults, 'search-captions');
    throwForFirstError(promptResults, 'search-prompts');

    return {
      articles: mergeOrderedRows(articleResults),
      captions: mergeOrderedRows(captionResults),
      prompts: mergeOrderedRows(promptResults),
    };
  }
}

export function buildLiteralContainsPattern(query: string) {
  const escaped = query
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
  return `%${escaped}%`;
}

export function quotePostgrestValue(value: string) {
  if (value.includes('"')) {
    throw new Error('Double quotes cannot be represented safely in a PostgREST logical filter');
  }
  const escaped = value.replace(/\\/g, '\\\\');
  return `"${escaped}"`;
}

function buildOrFilter(columns: readonly string[], quotedPattern: string) {
  return columns.map((column) => `${column}.ilike.${quotedPattern}`).join(',');
}

type SearchQueryResult = { data: unknown[] | null; error: unknown };

function throwForFirstError(
  results: SearchQueryResult[],
  operation: ConstructorParameters<typeof GlobalSearchRepositoryError>[0]
) {
  const failed = results.find((result) => result.error);
  if (failed) throw new GlobalSearchRepositoryError(operation, failed.error);
}

function mergeOrderedRows(results: SearchQueryResult[]) {
  const rows = results.flatMap((result) => result.data ?? []);
  const unique = new Map<string, Record<string, unknown>>();

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : JSON.stringify(record);
    if (!unique.has(id)) unique.set(id, record);
  }

  return [...unique.values()]
    .sort((left, right) => timestamp(right.created_at) - timestamp(left.created_at))
    .slice(0, RESULT_LIMIT)
    .map((record) => {
      const projected = { ...record };
      delete projected.created_at;
      return projected;
    });
}

function timestamp(value: unknown) {
  if (typeof value !== 'string') return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
