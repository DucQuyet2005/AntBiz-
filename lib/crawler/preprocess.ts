/**
 * lib/crawler/preprocess.ts
 * TypeScript replacement for python/auto_post_pipeline.py → preprocess()
 * Uses Cheerio (server-side jQuery) instead of BeautifulSoup
 */

import * as cheerio from 'cheerio';
import type { CrawlResult } from './index';

export interface BodyBlock {
  type: 'paragraph' | 'heading2' | 'heading3' | 'image';
  text?: string;
  url?: string;
  caption?: string;
}

export interface ImageBlock {
  url: string;
  caption: string;
}

export interface ArticleData {
  url: string;
  title: string;
  category: string;
  description: string;
  author: string;
  published_at: string;
  views: string;
  tags: string[];
  images: ImageBlock[];
  body: BodyBlock[];
  full_text: string;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Find the common ancestor of h1 and #html_content to scope the article area.
 * This prevents picking up sidebar hashtags/authors. Equivalent to find_article_scope() in Python.
 */
function findArticleScope($: cheerio.CheerioAPI): cheerio.Cheerio<any> {
  const h1 = $('h1').first();
  let contentRoot = $('#html_content').first();

  // If #html_content is not found, try <article> or <main>
  if (!contentRoot.length) {
    contentRoot = $('article').first();
  }
  if (!contentRoot.length) {
    contentRoot = $('main').first();
  }

  if (!h1.length || !contentRoot.length) return $.root() as cheerio.Cheerio<any>;

  // Build ancestor set by walking up from h1
  const h1AncestorSet = new Set<unknown>();
  let node = h1.parent();
  while (node.length) {
    node.each((_, el) => { h1AncestorSet.add(el); });
    node = node.parent();
  }

  // Walk up from contentRoot until we find a shared ancestor with h1
  let scope = contentRoot.parent();
  while (scope.length) {
    let found = false;
    scope.each((_, el) => { if (h1AncestorSet.has(el)) found = true; });
    if (found) return scope;
    scope = scope.parent();
  }

  return $.root() as cheerio.Cheerio<any>;
}


/**
 * Parse crawled HTML into structured article data.
 * Equivalent to preprocess() in auto_post_pipeline.py
 */
function cleanCaption(alt: string | undefined): string {
  if (!alt) return '';
  const cleaned = cleanText(alt);
  // If it's a JSON path or key like sections.0.sectionContents.0.images.0.url
  if (/^sections\.\d+/i.test(cleaned) || /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_.-]+$/i.test(cleaned)) {
    return '';
  }
  return cleaned;
}

function formatDateVN(date: Date): string {
  const tzOffset = 7 * 60 * 60 * 1000; // Vietnam +7
  const vnTime = new Date(date.getTime() + (date.getTimezoneOffset() * 60000) + tzOffset);
  const day = String(vnTime.getDate()).padStart(2, '0');
  const month = String(vnTime.getMonth() + 1).padStart(2, '0');
  const year = vnTime.getFullYear();
  const hours = String(vnTime.getHours()).padStart(2, '0');
  const minutes = String(vnTime.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function parsePublishedAt(rawStr: string): string {
  const clean = rawStr.trim();
  if (!clean) return '';

  // If it's relative time, return as-is
  const isRelative = /phút|phut|tiếng|tieng|giờ|gio|ngày|ngay|trước|truoc|hôm|hom/i.test(clean);
  if (isRelative) {
    return clean;
  }

  // If already in DD/MM/YYYY HH:mm format
  if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(clean)) {
    return clean;
  }

  // If it's an ISO date or parseable timestamp, format it nicely
  const parsedTimestamp = Date.parse(clean);
  if (!isNaN(parsedTimestamp)) {
    if (clean.includes('-') || clean.includes('T') || clean.includes(':')) {
      return formatDateVN(new Date(parsedTimestamp));
    }
  }

  return clean;
}

export function preprocessArticle(raw: CrawlResult): ArticleData {
  console.log('\n🔧 [Preprocess] Đang tiền xử lý dữ liệu...');

  const fullHtml = raw.fullPageHtml || raw.contentHtml;
  const $ = cheerio.load(fullHtml);

  const scope = findArticleScope($);

  // ── JSON-LD Schema Extraction ─────────────────────────
  let jsonLdCategory = '';
  let jsonLdTitle = '';
  let jsonLdDescription = '';
  let jsonLdAuthor = '';
  let jsonLdPublishedAt = '';

  try {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).text();
        const json = JSON.parse(text);
        const findArticle = (obj: any): any => {
          if (!obj) return null;
          const type = obj['@type'];
          if (type === 'NewsArticle' || type === 'Article' || type === 'BlogPosting') {
            return obj;
          }
          if (obj['@graph'] && Array.isArray(obj['@graph'])) {
            for (const item of obj['@graph']) {
              const res = findArticle(item);
              if (res) return res;
            }
          }
          return null;
        };
        const articleObj = findArticle(json);
        if (articleObj) {
          if (articleObj.articleSection) {
            const sec = cleanText(articleObj.articleSection);
            if (sec) jsonLdCategory = sec.startsWith('#') ? sec : `#${sec}`;
          }
          if (articleObj.headline) {
            jsonLdTitle = cleanText(articleObj.headline);
          }
          if (articleObj.description) {
            jsonLdDescription = cleanText(articleObj.description);
          }
          if (articleObj.author) {
            if (typeof articleObj.author === 'string') {
              jsonLdAuthor = cleanText(articleObj.author);
            } else if (Array.isArray(articleObj.author)) {
              jsonLdAuthor = cleanText(articleObj.author[0]?.name || '');
            } else if (articleObj.author.name) {
              jsonLdAuthor = cleanText(articleObj.author.name);
            }
          }
          if (articleObj.datePublished) {
            jsonLdPublishedAt = cleanText(articleObj.datePublished);
          }
        }
      } catch (e) {
        // ignore
      }
    });
  } catch (e) {
    // ignore
  }

  // ── Category ──────────────────────
  let category = jsonLdCategory;
  if (!category) {
    // Narrow scope: only check elements before the first H1, or within a specific category tag at the top of the article.
    const h1 = $('h1').first();
    const preTitleArea = h1.length ? h1.prevAll() : null;
    
    // Find category links in elements preceding the h1
    if (preTitleArea && preTitleArea.length) {
      const links = preTitleArea.find('a[href*="/category/"], a[href*="/the-loai/"], a[href*="/hashtag/"]');
      links.each((_, el) => {
        const text = cleanText($(el).text());
        if (text && (text.startsWith('#') || $(el).attr('href')?.includes('/category/') || $(el).attr('href')?.includes('/the-loai/'))) {
          category = text.startsWith('#') ? text : `#${text}`;
          return false;
        }
      });
    }

    // Fallback: check elements that are inside a meta category class, but only within the article header area
    if (!category) {
      const metaCategory = $('.article-category, .post-category, .news-category').first();
      if (metaCategory.length) {
        const text = cleanText(metaCategory.text());
        if (text) category = text.startsWith('#') ? text : `#${text}`;
      }
    }
    
    // NOTE: No global search on scope.find("a[href^='/hashtag/']") or tags! 
    // If not found in the immediate top area, category remains empty to prevent random grabs from sidebar/footer.
  }

  // ── Title ──────────────────────────────────────────────────────────────
  let title = jsonLdTitle;
  if (!title) {
    $('h1').each((_, el) => {
      const text = cleanText($(el).text());
      if (text && text.toLowerCase() !== 'spotlight' && text.toLowerCase() !== 'góc nhìn mới') {
        title = text;
        return false; // Break loop
      }
    });
  }

  if (!title) {
    title = cleanText(raw.title || $('title').text().replace(/ - Góc Nhìn Mới.*/i, ''));
  }

  // ── Description / sapo ────────────────────────────────────────────────
  let description = jsonLdDescription;
  if (!description) {
    // Try h4 (often used as sapo in Spotlight layouts)
    const h4Text = cleanText($('h4').first().text());
    description = cleanText(scope.find('p.mb-5').first().text()) || h4Text ||
      cleanText($('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '');
  }

  if (!description && raw.metadata?.description) {
    description = cleanText(raw.metadata.description);
  }

  // ── Author ────────────────────────────────────────────────────────────
  let author = jsonLdAuthor;
  if (!author) {
    // For Spotlight style: look for a parent with class space-x-3 or gap-3 containing date and author text
    const authorP = $('.flex-row, .space-x-3').find('p.text-body-sm, span.font-semibold').first();
    
    author = cleanText(
      authorP.text() ||
      scope.find('span.font-bold.text-gray-900').first().text() ||
      scope.find('a[href^="/authors/"] p').first().text() ||
      $('span.font-bold.text-gray-900').first().text() ||
      $('a[href^="/authors/"] p').first().text() || ''
    );
  }

  // ── Published date ────────────────────────────────────────────────────
  let rawPublishedAt = cleanText(
    scope.find('.article-date, .post-date, .date, .time, time, p.text-gray-400, span.text-gray-500').first().text() ||
    $('.article-date, .post-date, .date, .time, time, p.text-gray-400, span.text-gray-500').first().text() || ''
  );
  if (!rawPublishedAt) {
    rawPublishedAt = jsonLdPublishedAt;
  }
  const published_at = parsePublishedAt(rawPublishedAt);

  // ── Views (element next to lucide-eye svg) ────────────────────────────
  let views = '';
  let eyeSvg = scope.find('svg.lucide-eye').first();
  if (!eyeSvg.length) {
    eyeSvg = $('svg.lucide-eye').first();
  }
  if (eyeSvg.length) {
    const parentSpan = eyeSvg.parent('span');
    if (parentSpan.length) views = cleanText(parentSpan.text());
  }

  // ── Body paragraphs + images from #html_content ───────────────────────
  const bodyBlocks: BodyBlock[] = [];
  const images: ImageBlock[] = [];
  const contentRoot = $('#html_content');

  if (contentRoot.length) {
    contentRoot.find('[data-content-type]').each((_, el) => {
      const block = $(el);
      const btype = block.attr('data-content-type');

      if (btype === 'paragraph') {
        const text = cleanText(block.text());
        if (text) bodyBlocks.push({ type: 'paragraph', text });
      } else if (btype === 'heading') {
        const text = cleanText(block.text());
        const level = block.attr('data-level') || '2';
        if (text) bodyBlocks.push({ type: `heading${level}` as 'heading2' | 'heading3', text });
      } else if (btype === 'image') {
        const imgUrl = block.attr('data-url') || '';
        const caption = cleanCaption(block.attr('data-caption') || block.attr('alt'));
        if (imgUrl) {
          images.push({ url: imgUrl, caption });
          bodyBlocks.push({ type: 'image', url: imgUrl, caption });
        }
      }
    });
  } else {
    // Fallback: parse generic p/h2/h3/div tags and images in DOM order within the determined scope
    const seenTexts = new Set<string>();
    const seenImageUrls = new Set<string>();

    scope.find('p, h2, h3, img, div.content-body, div.article-body, div.post-content').each((_, el) => {
      const tagName = (el as any).tagName || el.name;
      const cheerioEl = $(el);

      // Avoid matching parent elements whose children will be parsed individually to prevent duplicate text blocks
      if (tagName !== 'img' && cheerioEl.find('p, h2, h3').length > 0) {
        return;
      }

      if (tagName === 'img') {
        const src = cheerioEl.attr('src') || '';
        if (
          !src ||
          src.startsWith('/') ||
          src.includes('logo') ||
          src.includes('no-data') ||
          src.includes('track-view') ||
          src.includes('author')
        ) {
          return;
        }
        if (!seenImageUrls.has(src)) {
          seenImageUrls.add(src);
          const caption = cleanCaption(cheerioEl.attr('alt'));
          images.push({ url: src, caption });
          bodyBlocks.push({ type: 'image', url: src, caption });
        }
      } else {
        const text = cleanText(cheerioEl.text());
        if (!text || text.length <= 20) return;

        // Skip boilerplate / author / date / category / bookmark text
        if (
          text.includes('Bạn chưa lưu nội dung nào') ||
          text.includes('Hãy khám phá và lưu lại để xem') ||
          text === author ||
          text === published_at ||
          text.startsWith('#') ||
          text === category
        ) {
          return;
        }

        if (seenTexts.has(text)) return;
        seenTexts.add(text);

        let btype: BodyBlock['type'] = 'paragraph';
        if (tagName === 'h2') btype = 'heading2';
        else if (tagName === 'h3') btype = 'heading3';
        // If it's a div and contains significant text, treat as paragraph
        else if (tagName === 'div' && text.length > 50) btype = 'paragraph';

        bodyBlocks.push({ type: btype, text });
      }
    });
  }

  // ── Fallback image from og:image if no body images found ─────────────
  if (images.length === 0) {
    let ogImg = $('meta[property="og:image"]').attr('content');
    if (!ogImg && raw.metadata?.['og:image']) {
      ogImg = raw.metadata['og:image'];
    }
    if (ogImg) {
      images.push({ url: ogImg, caption: title });
      console.log('   📸 Dùng og:image làm ảnh đại diện');
    }
  }

  // ── Tags (article tags, not sidebar ones) ─────────────────────────────
  const tags: string[] = [];
  scope.find('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('/tag/')) {
      const tag = cleanText($(el).text());
      if (tag && !tags.includes(tag)) tags.push(tag);
    }
  });

  const full_text = bodyBlocks
    .filter((b) => b.type !== 'image' && b.text)
    .map((b) => b.text!)
    .join('\n');

  console.log(`   ✅ Preprocess xong — ${bodyBlocks.length} blocks, ${images.length} ảnh, ${tags.length} hashtag`);

  return {
    url: raw.url,
    title,
    category,
    description,
    author,
    published_at,
    views,
    tags,
    images,
    body: bodyBlocks,
    full_text,
  };
}
