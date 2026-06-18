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
  const contentRoot = $('#html_content').first();

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
export function preprocessArticle(raw: CrawlResult): ArticleData {
  console.log('\n🔧 [Preprocess] Đang tiền xử lý dữ liệu...');

  const fullHtml = raw.fullPageHtml || raw.contentHtml;
  const $ = cheerio.load(fullHtml);

  const scope = findArticleScope($);

  // ── Category (hashtag đầu bài, e.g. #Tổ ấm 4.0) ──────────────────────
  const categoryEl = scope.find("a[href^='/hashtag/']").first();
  const category = cleanText(categoryEl.text());

  // ── Title ──────────────────────────────────────────────────────────────
  let title = '';
  $('h1').each((_, el) => {
    const text = cleanText($(el).text());
    if (text && text.toLowerCase() !== 'spotlight' && text.toLowerCase() !== 'góc nhìn mới') {
      title = text;
      return false; // Break loop
    }
  });

  if (!title) {
    title = cleanText(raw.title || $('title').text().replace(/ - Góc Nhìn Mới.*/i, ''));
  }

  // ── Description / sapo ────────────────────────────────────────────────
  const description = cleanText(scope.find('p.mb-5').first().text()) ||
                      cleanText($('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '');

  // ── Author ────────────────────────────────────────────────────────────
  const author = cleanText(scope.find('span.font-bold.text-gray-900').first().text() ||
                           scope.find('a[href^="/authors/"] p').first().text() || '');

  // ── Published date ────────────────────────────────────────────────────
  const published_at = cleanText(scope.find('p.text-gray-400').first().text() ||
                                 scope.find('span.text-gray-500').first().text() || '');

  // ── Views (element next to lucide-eye svg) ────────────────────────────
  let views = '';
  const eyeSvg = scope.find('svg.lucide-eye').first();
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
        const caption = cleanText(block.attr('data-caption') || '');
        if (imgUrl) {
          images.push({ url: imgUrl, caption });
          bodyBlocks.push({ type: 'image', url: imgUrl, caption });
        }
      }
    });
  } else {
    // Fallback: parse generic p/h2/h3 tags and images in DOM order
    const seenTexts = new Set<string>();
    const seenImageUrls = new Set<string>();

    $('p, h2, h3, img').each((_, el) => {
      const tagName = (el as any).tagName || el.name;

      if (tagName === 'img') {
        const src = $(el).attr('src') || '';
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
          images.push({ url: src, caption: '' });
          bodyBlocks.push({ type: 'image', url: src, caption: '' });
        }
      } else {
        const text = cleanText($(el).text());
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

        const btype = tagName === 'p' ? 'paragraph' : (`heading${tagName[1]}` as 'heading2' | 'heading3');
        bodyBlocks.push({ type: btype, text });
      }
    });
  }

  // ── Fallback image from og:image if no body images found ─────────────
  if (images.length === 0) {
    const ogImg = $('meta[property="og:image"]').attr('content');
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
