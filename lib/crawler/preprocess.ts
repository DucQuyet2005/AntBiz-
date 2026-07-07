/**
 * lib/crawler/preprocess.ts
 * TypeScript replacement for python/auto_post_pipeline.py → preprocess()
 * Uses Cheerio (server-side jQuery) instead of BeautifulSoup
 */

import * as cheerio from 'cheerio';
import type { CrawlResult } from './index';

export type PageType = 'ARTICLE' | 'LISTING';

export type ArticleLayout =
  | 'standard'
  | 'video'
  | 'photo'
  | 'dmagazine' // Dan Tri longform
  | 'megastory' // Tuoi Tre longform
  | 'podcast'
  | 'infographic'
  | 'tamdiem'    // Dan Tri editorial
  | 'bandoc'     // Dan Tri reader submissions
  | 'sub_publication' // cuoi.tuoitre.vn, etc.
  | 'gocnhinmoi_standard'
  | 'gocnhinmoi_spotlight';

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
  type: 'ARTICLE';
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

export interface ListingItem {
  url: string;
  title: string;
}

export interface ListingData {
  type: 'LISTING';
  url: string;
  extractedUrls: ListingItem[];
  warning: string;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function cleanCaption(alt: string | undefined): string {
  if (!alt) return '';
  const cleaned = cleanText(alt);
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

  const isRelative = /phút|phut|tiếng|tieng|giờ|gio|ngày|ngay|trước|truoc|hôm|hom/i.test(clean);
  if (isRelative) {
    return clean;
  }

  if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(clean)) {
    return clean;
  }

  const parsedTimestamp = Date.parse(clean);
  if (!isNaN(parsedTimestamp)) {
    if (clean.includes('-') || clean.includes('T') || clean.includes(':')) {
      return formatDateVN(new Date(parsedTimestamp));
    }
  }

  return clean;
}

/**
 * Detects whether a page is an ARTICLE or a LISTING page, and what layout it has.
 */
export function detectPageType(url: string, html: string): { type: PageType; layout: ArticleLayout } {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (hostname.includes('dantri.com.vn')) {
      const isListing =
        urlObj.pathname.includes('/event/') ||
        urlObj.pathname.includes('/chu-de/') ||
        urlObj.pathname.includes('/tag/') ||
        (urlObj.pathname.endsWith('.htm') &&
          !/-\d{6,}\.htm$/i.test(urlObj.pathname) &&
          !/(dmagazine|photo-news|photo-story|tam-diem|ban-doc|infographic|interactive|video)/i.test(urlObj.pathname)) ||
        (!urlObj.pathname.endsWith('.htm') && urlObj.pathname !== '/');

      if (isListing) {
        return { type: 'LISTING', layout: 'standard' };
      }

      let layout: ArticleLayout = 'standard';
      if (urlObj.pathname.includes('/dt360/') || urlObj.pathname.includes('/video/')) {
        layout = 'video';
      } else if (urlObj.pathname.includes('/photo-news') || urlObj.pathname.includes('/photo-story')) {
        layout = 'photo';
      } else if (urlObj.pathname.includes('/dmagazine')) {
        layout = 'dmagazine';
      } else if (urlObj.pathname.includes('/tam-diem')) {
        layout = 'tamdiem';
      } else if (urlObj.pathname.includes('/ban-doc')) {
        layout = 'bandoc';
      } else if (urlObj.pathname.includes('/infographic') || urlObj.pathname.includes('/interactive')) {
        layout = 'infographic';
      } else {
        const $ = cheerio.load(html);
        if ($('.dmagazine-container, .dmagazine-body, .dmagazine').length > 0) {
          layout = 'dmagazine';
        } else if ($('.video-player, .dt-video').length > 0) {
          layout = 'video';
        }
      }
      return { type: 'ARTICLE', layout };
    }

    if (hostname.includes('tuoitre.vn')) {
      const isListing =
        urlObj.pathname.includes('/tac-gia/') ||
        /-\s*e\d+\.htm$/i.test(urlObj.pathname) ||
        (urlObj.pathname.endsWith('.htm') &&
          !/-\d{6,}\.htm$/i.test(urlObj.pathname) &&
          !/(video|photo|infographic|megastory|podcast)/i.test(urlObj.pathname)) ||
        (!urlObj.pathname.endsWith('.htm') && urlObj.pathname !== '/');

      if (isListing) {
        return { type: 'LISTING', layout: 'standard' };
      }

      let layout: ArticleLayout = 'standard';
      if (hostname.startsWith('cuoi.') || hostname.startsWith('cuoituan.') || hostname.startsWith('news.')) {
        layout = 'sub_publication';
      } else if (urlObj.pathname.includes('/video/') || hostname.startsWith('video.')) {
        layout = 'video';
      } else if (hostname.startsWith('podcast.') || urlObj.pathname.includes('/podcast/')) {
        layout = 'podcast';
      } else if (urlObj.pathname.includes('/photo/') || urlObj.pathname.includes('/photo.htm')) {
        layout = 'photo';
      } else if (urlObj.pathname.includes('/infographic/')) {
        layout = 'infographic';
      } else if (urlObj.pathname.includes('/megastory/')) {
        layout = 'megastory';
      }
      return { type: 'ARTICLE', layout };
    }
  } catch (e) {
    // ignore
  }

  return { type: 'ARTICLE', layout: 'standard' };
}

function extractListingLinks(url: string, $: cheerio.CheerioAPI): ListingItem[] {
  const urlObj = new URL(url);
  const domain = urlObj.hostname.replace('www.', '');
  const items: ListingItem[] = [];
  const seenUrls = new Set<string>();

  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    try {
      const resolvedUrl = new URL(href, url).href;
      const resolvedObj = new URL(resolvedUrl);

      if (resolvedObj.hostname.includes(domain)) {
        const path = resolvedObj.pathname.toLowerCase();
        if (
          path === '/' ||
          path.includes('/search') ||
          path.includes('/login') ||
          path.includes('/register') ||
          path.includes('/terms') ||
          path.includes('/privacy')
        ) {
          return;
        }

        if (domain.includes('dantri.com.vn') || domain.includes('tuoitre.vn')) {
          if (!resolvedObj.pathname.endsWith('.htm')) return;
        }

        if (!seenUrls.has(resolvedUrl)) {
          seenUrls.add(resolvedUrl);
          const title = cleanText($(el).text() || $(el).attr('title') || '');
          items.push({ url: resolvedUrl, title });
        }
      }
    } catch {
      // ignore
    }
  });

  return items;
}

function findArticleScope($: cheerio.CheerioAPI): cheerio.Cheerio<any> {
  const h1 = $('h1').first();
  let contentRoot = $('#html_content').first();

  if (!contentRoot.length) {
    contentRoot = $('article').first();
  }
  if (!contentRoot.length) {
    contentRoot = $('main').first();
  }

  if (!h1.length || !contentRoot.length) return $.root() as cheerio.Cheerio<any>;

  const h1AncestorSet = new Set<unknown>();
  let node = h1.parent();
  while (node.length) {
    node.each((_, el) => { h1AncestorSet.add(el); });
    node = node.parent();
  }

  let scope = contentRoot.parent();
  while (scope.length) {
    let found = false;
    scope.each((_, el) => { if (h1AncestorSet.has(el)) found = true; });
    if (found) return scope;
    scope = scope.parent();
  }

  return $.root() as cheerio.Cheerio<any>;
}

export function preprocessArticle(raw: CrawlResult): ArticleData | ListingData {
  console.log(`\n🔧 [Preprocess] Đang tiền xử lý dữ liệu cho: ${raw.url}`);

  const fullHtml = raw.fullPageHtml || raw.contentHtml;
  const $ = cheerio.load(fullHtml);

  // Detect Type & Layout
  const { type, layout } = detectPageType(raw.url, fullHtml);

  if (type === 'LISTING') {
    const extractedUrls = extractListingLinks(raw.url, $);
    console.log(`   📂 Nhận diện trang LISTING — Trích xuất được ${extractedUrls.length} liên kết`);
    return {
      type: 'LISTING',
      url: raw.url,
      extractedUrls,
      warning: `Trang này là danh sách, đã trích xuất ${extractedUrls.length} liên kết con.`,
    };
  }

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

  const scope = findArticleScope($);

  // ── Category ──────────────────────
  let category = jsonLdCategory;
  if (!category) {
    const h1 = $('h1').first();
    const preTitleArea = h1.length ? h1.prevAll() : null;
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

    if (!category) {
      const metaCategory = $('.article-category, .post-category, .news-category').first();
      if (metaCategory.length) {
        const text = cleanText(metaCategory.text());
        if (text) category = text.startsWith('#') ? text : `#${text}`;
      }
    }
  }

  // ── Title ──────────────────────────────────────────────────────────────
  let title = jsonLdTitle;
  if (!title) {
    $('h1').each((_, el) => {
      const text = cleanText($(el).text());
      if (text && text.toLowerCase() !== 'spotlight' && text.toLowerCase() !== 'góc nhìn mới') {
        title = text;
        return false;
      }
    });
  }
  if (!title) {
    title = cleanText(raw.title || $('title').text().replace(/ - Góc Nhìn Mới.*/i, ''));
  }

  // ── Description / sapo ────────────────────────────────────────────────
  let description = jsonLdDescription;
  if (!description) {
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

  // ── Views ─────────────────────────────────────────────────────────────
  let views = '';
  let eyeSvg = scope.find('svg.lucide-eye').first();
  if (!eyeSvg.length) {
    eyeSvg = $('svg.lucide-eye').first();
  }
  if (eyeSvg.length) {
    const parentSpan = eyeSvg.parent('span');
    if (parentSpan.length) views = cleanText(parentSpan.text());
  }

  // ── Body blocks & images ──────────────────────────────────────────────
  const bodyBlocks: BodyBlock[] = [];
  const images: ImageBlock[] = [];

  const isDantri = raw.url.includes('dantri.com.vn');
  const isTuoitre = raw.url.includes('tuoitre.vn');

  if (isDantri || isTuoitre) {
    const contentRoot = $('.singular-content, .detail-content, .dmagazine-content, .fck, article').first();
    if (contentRoot.length) {
      contentRoot.find('p, h2, h3, figure, .photo, .picture, .video-player, img').each((_, el) => {
        const cheerioEl = $(el);
        const tagName = (el as any).tagName || el.name;

        if (tagName === 'figure' || cheerioEl.hasClass('photo') || cheerioEl.hasClass('picture')) {
          const img = cheerioEl.find('img').first();
          const src = img.attr('src') || img.attr('data-src') || '';
          if (src && !src.includes('logo') && !src.startsWith('/')) {
            const caption = cleanCaption(cheerioEl.find('figcaption, .caption, .photo-description, .cap').first().text() || img.attr('alt'));
            images.push({ url: src, caption });
            bodyBlocks.push({ type: 'image', url: src, caption });
          }
        } else if (tagName === 'img') {
          // If it is a standalone image not inside a figure
          const src = cheerioEl.attr('src') || cheerioEl.attr('data-src') || '';
          if (src && !src.includes('logo') && !src.startsWith('/') && !images.some(img => img.url === src)) {
            const caption = cleanCaption(cheerioEl.attr('alt') || cheerioEl.attr('title'));
            images.push({ url: src, caption });
            bodyBlocks.push({ type: 'image', url: src, caption });
          }
        } else if (tagName === 'p') {
          const text = cleanText(cheerioEl.text());
          // Skip author signature in body if it matches author field or is too short
          if (text && text.length > 10 && text !== author) {
            bodyBlocks.push({ type: 'paragraph', text });
          }
        } else if (tagName === 'h2') {
          const text = cleanText(cheerioEl.text());
          if (text) bodyBlocks.push({ type: 'heading2', text });
        } else if (tagName === 'h3') {
          const text = cleanText(cheerioEl.text());
          if (text) bodyBlocks.push({ type: 'heading3', text });
        }
      });
    }
  } else {
    // Goc Nhin Moi or Fallback
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
      const seenTexts = new Set<string>();
      const seenImageUrls = new Set<string>();

      scope.find('p, h2, h3, img, div.content-body, div.article-body, div.post-content').each((_, el) => {
        const tagName = (el as any).tagName || el.name;
        const cheerioEl = $(el);

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
          else if (tagName === 'div' && text.length > 50) btype = 'paragraph';

          bodyBlocks.push({ type: btype, text });
        }
      });
    }
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

  // ── Tags ──────────────────────────────────────────────────────────────
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
    type: 'ARTICLE',
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
