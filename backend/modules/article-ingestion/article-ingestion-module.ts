import { ArticleIngestionError } from './errors';
import type { ManualArticleInput } from './article-ingestion-schemas';
import type {
  ArticleIngestionModuleInterface,
  ArticleIngestionRepository,
  ArticleRecord,
  ArticleSource,
  ArticleSourceResult,
} from './article-ingestion-types';

export class ArticleIngestionModule implements ArticleIngestionModuleInterface {
  constructor(
    private readonly source: ArticleSource,
    private readonly repository: ArticleIngestionRepository
  ) {}

  async ingestUrl(url: string) {
    try { new URL(url); }
    catch { throw new ArticleIngestionError('INVALID_URL', 400, 'Invalid URL format'); }

    let safe: boolean;
    try { safe = await this.source.isSafe(url); }
    catch (error) {
      throw new ArticleIngestionError('SOURCE_FAILED', 500, 'Lỗi kiểm tra an toàn URL', error);
    }
    if (!safe) {
      throw new ArticleIngestionError(
        'UNSAFE_URL', 400, 'Địa chỉ URL không được phép truy cập (SSRF Protection)'
      );
    }

    let article: ArticleSourceResult;
    try { article = await this.source.crawl(url); }
    catch (error) {
      throw new ArticleIngestionError(
        'SOURCE_FAILED', 500, error instanceof Error ? error.message : 'Lỗi cào dữ liệu', error
      );
    }
    if (article.type === 'LISTING') {
      return {
        type: 'LISTING', url: article.url,
        extractedUrls: article.extractedUrls, warning: article.warning,
      };
    }

    const normalized = normalizeCrawledArticle(article);
    const existing = await this.findExistingBestEffort(url);
    let articleId = existing?.id || '';
    try {
      const saved = existing
        ? await this.repository.update(existing.id, normalized.persistence)
        : await this.repository.insert({ url, ...normalized.persistence });
      articleId = saved.id || articleId;
    } catch (error) {
      console.error(`[Scrape API] DB ${existing ? 'Update' : 'Insert'} Error:`, error);
    }

    return {
      id: articleId,
      title: normalized.title,
      description: normalized.description,
      full_text: normalized.fullText,
      imageUrl: normalized.imageUrl,
      images: normalized.images,
      author: normalized.author,
      category: normalized.category,
      tags: normalized.tagsString,
      published_at: normalized.publishedAt,
      views: normalized.views,
      url,
      body: article.body || [],
      author_image_url: article.author_image_url || '',
    };
  }

  async createManual(input: ManualArticleInput) {
    const now = new Date().toISOString();
    const url = `manual://article-${Date.now()}`;
    const description = input.full_text.length > 200
      ? `${input.full_text.slice(0, 197)}...`
      : input.full_text;
    const category = input.category
      ? input.category.startsWith('#') ? input.category : `#${input.category}`
      : '#Manual';
    const author = input.author || 'AntBiz User';
    const images = input.imageUrl
      ? input.imageUrl.split('\n').map((value) => value.trim()).filter(Boolean).map((imageUrl) => ({ url: imageUrl }))
      : [];
    let inserted;
    try {
      inserted = await this.repository.insert({
        url, title: input.title, description, author, published_at: now, views: '0', images,
        body: [{ type: 'text', text: input.full_text }], full_text: input.full_text,
        category, tags: ['manual'], crawled_at: now,
      });
    } catch (error) {
      throw new ArticleIngestionError(
        'MANUAL_PERSISTENCE_FAILED', 500,
        'Không thể lưu bài viết tự viết tay vào database', error
      );
    }
    return {
      id: inserted.id,
      title: input.title,
      description,
      full_text: input.full_text,
      author,
      category,
      tags: 'manual',
      published_at: now,
      views: '0',
      url,
      imageUrl: input.imageUrl || '',
      images,
      body: [{ type: 'paragraph', text: input.full_text }],
    };
  }

  private async findExistingBestEffort(url: string): Promise<ArticleRecord | null> {
    try {
      const exact = await this.repository.findExact(url);
      if (exact) return exact;
    } catch (error) {
      console.error('[Scrape API] Exact URL lookup error:', error);
    }
    try { return await this.repository.findPrefix(url); }
    catch (error) {
      console.error('[Scrape API] Prefix URL lookup error:', error);
      return null;
    }
  }
}

function normalizeCrawledArticle(article: ArticleSourceResult) {
  const title = article.title || '';
  const description = article.description || '';
  const author = article.author || '';
  const category = article.category
    ? article.category.startsWith('#') ? article.category : `#${article.category}`
    : '';
  
  const images: Array<{ url: string; caption?: string }> = [...(article.images || [])];
  if (Array.isArray(article.body)) {
    for (const block of article.body) {
      if (block && block.type === 'image' && typeof block.url === 'string' && block.url.trim()) {
        const cleanUrl = block.url.trim();
        if (!images.some((img) => img.url === cleanUrl)) {
          images.push({ url: cleanUrl, caption: block.caption });
        }
      }
    }
  }

  const tags = article.tags || [];
  const fullText = article.full_text || description;
  const publishedAt = article.published_at || '';
  const views = article.views || '';
  
  console.log(`[Scrape API] Đã crawl được ${images.length} hình ảnh từ bài viết.`);
  if (images.length > 0) {
    console.log(`[Scrape API] Danh sách URL ảnh:`, images.map(i => i.url));
  }

  return {
    title, description, author, category, fullText, publishedAt, views, images,
    imageUrl: images.map((image) => image.url).join('\n'),
    tagsString: tags.join(', '),
    persistence: {
      title, description, author, published_at: publishedAt, views, images,
      body: article.body || [], full_text: fullText, category, tags,
      crawled_at: new Date().toISOString(),
    },
  };
}
