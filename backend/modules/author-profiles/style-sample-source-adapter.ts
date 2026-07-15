import { crawlUrl, isSafeUrl } from '@/lib/crawler';
import { preprocessArticle } from '@/lib/crawler/preprocess';
import type { StyleSampleSource } from './author-profile-types';

export class ProductionStyleSampleSource implements StyleSampleSource {
  isSafe(url: string) { return isSafeUrl(url); }

  async load(url: string) {
    const raw = await crawlUrl(url);
    return { raw, processed: preprocessArticle(raw) };
  }
}
