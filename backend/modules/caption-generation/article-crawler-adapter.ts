import { crawlUrl } from '@/lib/crawler';
import { preprocessArticle } from '@/lib/crawler/preprocess';
import type { ArticleCrawler, CrawledArticle } from './caption-generation-types';

export class ProductionArticleCrawler implements ArticleCrawler {
  async crawl(url: string): Promise<CrawledArticle> {
    const raw = await crawlUrl(url);
    return preprocessArticle(raw) as CrawledArticle;
  }
}
