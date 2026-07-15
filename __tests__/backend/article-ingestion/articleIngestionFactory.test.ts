import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ client: true })),
  module: vi.fn(function Module(source, repository) { return { source, repository }; }),
  source: vi.fn(function Source() { return { source: true }; }),
  repository: vi.fn(function Repository(client) { return { client }; }),
}));

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('@/backend/modules/article-ingestion/article-ingestion-module', () => ({
  ArticleIngestionModule: mocks.module,
}));
vi.mock('@/backend/modules/article-ingestion/article-source-adapter', () => ({
  ProductionArticleSource: mocks.source,
}));
vi.mock('@/backend/modules/article-ingestion/article-ingestion-repository', () => ({
  SupabaseArticleIngestionRepository: mocks.repository,
}));

import { buildArticleIngestionModule } from '@/app/api/scrape/_adapter';

describe('buildArticleIngestionModule', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it('constructs Supabase with the service-role key and wires production adapters', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';

    const builtModule = buildArticleIngestionModule();

    expect(mocks.createClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'service-role',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    expect(mocks.repository).toHaveBeenCalledWith({ client: true });
    expect(mocks.module).toHaveBeenCalledWith({ source: true }, { client: { client: true } });
    expect(builtModule).toEqual({ source: { source: true }, repository: { client: { client: true } } });
  });

  it('falls back to the anonymous key when no service-role key is configured', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';

    buildArticleIngestionModule();

    expect(mocks.createClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'anon',
      expect.any(Object)
    );
  });
});
