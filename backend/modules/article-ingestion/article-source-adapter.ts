import { crawlUrl, isSafeUrl } from '@/lib/crawler';
import { preprocessArticle } from '@/lib/crawler/preprocess';
import type { ArticleSource, ArticleSourceResult } from './article-ingestion-types';

export class ProductionArticleSource implements ArticleSource {
  isSafe(url: string) { return isSafeUrl(url); }

  async crawl(url: string): Promise<ArticleSourceResult> {
    return preprocessArticle(await crawlUrl(url)) as ArticleSourceResult;
  }
}
