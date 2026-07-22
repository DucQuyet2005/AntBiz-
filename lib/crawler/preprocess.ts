/**
 * lib/crawler/preprocess.ts
 * TypeScript replacement for python/auto_post_pipeline.py → preprocess()
 * Uses Cheerio (server-side jQuery) instead of BeautifulSoup
 */

import * as cheerio from 'cheerio';
import type { CrawlResult } from './index';

export interface BodyBlock {
  type: 'paragraph' | 'heading2' | 'heading3' | 'image' | 'section';
  text?: string;
  url?: string;
  caption?: string;
  className?: string;
  style?: string;
  html?: string;
}

export interface ImageBlock {
  url: string;
  caption: string;
}

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
  author_image_url?: string;
}

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  let decoded = str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#[xX]([a-fA-F0-9]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'");

  // In case of double encoding (e.g. &amp;#243; -> &#243; -> ó)
  if (decoded.includes('&')) {
    decoded = decoded
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&#[xX]([a-fA-F0-9]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&apos;/g, "'");
  }
  return decoded;
}

function cleanText(text: string): string {
  return decodeHtmlEntities(text.replace(/\s+/g, ' ').trim());
}

function resolveUrl(src: string, baseUrl: string): string {
  if (!src) return '';
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return src;
  }
}

function isInvalidImage(src: string, alt?: string, title?: string): boolean {
  if (!src) return true;
  
  const lowerSrc = src.toLowerCase();
  const lowerAlt = alt ? alt.toLowerCase() : '';
  const lowerTitle = title ? title.toLowerCase() : '';

  // Check common logo, icons, avatars, trackers, and social media/promo patterns in URL
  const invalidUrlPatterns = [
    'logo', 'no-data', 'track-view', 'author', 'tac-gia', 'tacgia', 'avatar', 'icon', 'banner', 'ads', 
    'loading', 'placeholder', 'pixel', 'gif', 'spacer', 'facebook', 'twitter', 
    'instagram', 'youtube', 'google-news', 'googlenews', 'google_news', 'news-google',
    'rating', 'star', 'star-rating', 'widget', 'gift'
  ];

  if (invalidUrlPatterns.some(pattern => lowerSrc.includes(pattern))) {
    return true;
  }

  // Check common logo, icons, avatars, promo patterns in Alt/Title text
  const invalidTextPatterns = [
    'logo', 'avatar', 'ảnh đại diện', 'tác giả', 'tac gia', 'author', 'icon', 'biểu tượng', 'banner', 'quảng cáo', 
    'google news', 'theo dõi trên', 'thông tin tài khoản', 'tài khoản', 'bình luận',
    'tặng sao'
  ];

  if (
    invalidTextPatterns.some(pattern => lowerAlt.includes(pattern) || lowerTitle.includes(pattern))
  ) {
    return true;
  }

  return false;
}

function isBoilerplateText(
  text: string, 
  author?: string, 
  published_at?: string, 
  category?: string, 
  title?: string, 
  description?: string
): boolean {
  if (!text) return true;
  const clean = text.trim();
  if (clean.length <= 15) return true; // Too short to be a meaningful paragraph

  const lowerText = clean.toLowerCase();

  // Duplicate checks as in original preprocess
  const lowerTitle = title ? title.toLowerCase() : '';
  const lowerAuthor = author ? author.toLowerCase() : '';
  const lowerPub = published_at ? published_at.toLowerCase() : '';
  const lowerDesc = description ? description.toLowerCase() : '';
  const lowerCate = category ? category.toLowerCase().replace('#', '') : '';

  if (
    lowerText === lowerAuthor ||
    lowerText === lowerPub ||
    lowerText === lowerCate ||
    lowerText === lowerTitle ||
    (lowerTitle && lowerText.includes(lowerTitle)) ||
    (lowerAuthor && lowerText.includes(lowerAuthor)) ||
    (lowerDesc && (lowerDesc.includes(lowerText) || lowerText.includes(lowerDesc))) ||
    clean.startsWith('#') ||
    (category && lowerText === category.toLowerCase())
  ) {
    return true;
  }

  const boilerplateKeywords = [
    'bạn chưa lưu nội dung nào',
    'hãy khám phá và lưu lại',
    'bình luận',
    'chia sẻ ý kiến',
    'gửi ý kiến',
    'tặng sao',
    'nạp thêm sao',
    'cho tác giả',
    'chuyển sao',
    'tặng 0',
    'thông tin tài khoản',
    'đăng nhập',
    'tạo tài khoản',
    'quên mật khẩu',
    'dòng sự kiện',
    'tin cùng chuyên mục',
    'tin liên quan',
    'tải ứng dụng',
    'theo dõi trên',
    'nhận gói tin tức',
    'đăng ký ngay',
    'gửi đến bạn những tin',
    'mời bạn quay lại bài viết',
    'đã có lỗi xảy ra',
    'không thành công',
    'tặng sao không thành công'
  ];

  return boilerplateKeywords.some(keyword => lowerText.includes(keyword));
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


function seenBoilerplate(txt: string): boolean {
  const boilerplate = [
    'đăng nhập', 'tạo tài khoản', 'quên mật khẩu', 'xem thêm',
    'bình luận', 'chia sẻ', 'thích', 'gửi tin nhắn', 'theo dõi',
    'trang chủ', 'tìm kiếm', 'phù hợp nhất', 'tất cả bình luận',
    'thêm bình luận', 'đăng ký', 'chính sách', 'điều khoản',
    'create account', 'log in', 'forgotten password', 'sign up'
  ];
  return boilerplate.some(b => txt.toLowerCase().includes(b));
}

function preprocessFacebook(raw: CrawlResult): ArticleData {
  console.log('\n🔧 [Preprocess Facebook] Đang tiền xử lý bài viết Facebook...');

  const html = raw.fullPageHtml || raw.contentHtml;
  const $ = cheerio.load(html);

  // 1. Trích xuất nội dung chữ (Status Text) của bài đăng Facebook
  let statusText = '';

  // Thử các selector phổ biến của Facebook cho nội dung bài viết
  const fbContentSelectors = [
    'div[data-ad-preview="message"]',
    'div[dir="auto"]',
    '.story_body_container',
    '._5rgt', // Facebook mobile
    '._5pat', // Facebook mobile post wrapper
    'div[role="article"]',
    'article',
    '.msg'
  ];

  for (const selector of fbContentSelectors) {
    const el = $(selector);
    if (el.length) {
      const texts: string[] = [];
      el.each((_, item) => {
        const txt = cleanText($(item).text());
        if (txt && txt.length > 10 && !seenBoilerplate(txt)) {
          texts.push(txt);
        }
      });
      if (texts.length) {
        statusText = texts.join('\n');
        break;
      }
    }
  }

  // Fallback: Lấy toàn bộ text trong p/span/div có độ dài hợp lý
  if (!statusText) {
    const lines: string[] = [];
    $('body p, body div, body span').each((_, el) => {
      const txt = cleanText($(el).text());
      if (txt && txt.length > 30 && !seenBoilerplate(txt) && !lines.includes(txt)) {
        lines.push(txt);
      }
    });
    statusText = lines.slice(0, 5).join('\n');
  }

  // 2. Trích xuất ảnh đính kèm (CDN fbcdn.net hoặc scontent)
  const images: ImageBlock[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (src && (src.includes('fbcdn') || src.includes('scontent')) && !src.includes('/rsrc.php') && !src.includes('emoji')) {
      const alt = cleanCaption($(el).attr('alt') || $(el).attr('title'));
      if (!images.some(img => img.url === src)) {
        images.push({ url: src, caption: alt || 'Ảnh bài viết Facebook' });
      }
    }
  });

  // 3. Xử lý Title và Description
  const title = raw.title?.replace(/ \| Facebook/i, '').replace(/ - Góc Nhìn Mới.*/i, '').trim() || 
                (statusText ? statusText.slice(0, 60) + '...' : 'Bài viết Facebook');

  const description = statusText || title;

  return {
    type: 'ARTICLE',
    url: raw.url,
    title,
    category: '#Facebook',
    description,
    author: 'Facebook Creator',
    published_at: formatDateVN(new Date()),
    views: '',
    tags: [],
    images,
    body: statusText ? [{ type: 'paragraph', text: statusText }] : [],
    full_text: statusText || description,
  };
}

export function preprocessArticle(raw: CrawlResult): ArticleData | ListingData {
  const url = raw.url || '';
  if (url.includes('facebook.com') || url.includes('fbcdn') || url.includes('fb.com') || url.includes('fb.watch')) {
    return preprocessFacebook(raw);
  }

  console.log('\n🔧 [Preprocess] Đang tiền xử lý dữ liệu...');

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


  const scope = findArticleScope($);
  let author_image_url = '';

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

        // Parse BreadcrumbList for Category
        if (json['@type'] === 'BreadcrumbList' && Array.isArray(json.itemListElement)) {
          const items = json.itemListElement;
          if (items.length > 1) {
            const lastItem = items[items.length - 1];
            const name = lastItem.item?.name || lastItem.name;
            if (name && name.toLowerCase() !== 'trang chủ') {
              jsonLdCategory = name.startsWith('#') ? name : `#${name}`;
            }
          }
        }

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
            let parsedAuthor = '';
            if (typeof articleObj.author === 'string') {
              parsedAuthor = cleanText(articleObj.author);
            } else if (Array.isArray(articleObj.author)) {
              parsedAuthor = cleanText(articleObj.author[0]?.name || '');
            } else if (articleObj.author.name) {
              parsedAuthor = cleanText(articleObj.author.name);
            }
            if (parsedAuthor && parsedAuthor.toLowerCase() !== 'trống') {
              jsonLdAuthor = parsedAuthor;
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

  // ── Dantri DT360/Video Javascript Data Extraction ──
  let dtGlobalArticle: any = null;
  let dtDistributionDate = '';
  let dtGlobalCategoryName = '';
  if (url.includes('dantri.com.vn')) {
    $('script').each((_, el) => {
      const text = $(el).text();
      if (text.includes('window.DT_GLOBAL.article=')) {
        try {
          const match = text.match(/window\.DT_GLOBAL\.article\s*=\s*({.*?});/);
          if (match && match[1]) {
            dtGlobalArticle = JSON.parse(match[1]);
          }
        } catch (e) {
          // ignore
        }
      }
      if (text.includes('window.DT_GLOBAL.article.distributionDate')) {
        try {
          const match = text.match(/window\.DT_GLOBAL\.article\.distributionDate\s*=\s*"(.*?)"/);
          if (match && match[1]) {
            dtDistributionDate = match[1];
          }
        } catch (e) {
          // ignore
        }
      }
      if (text.includes('window.DT_GLOBAL.article.category=')) {
        try {
          const match = text.match(/window\.DT_GLOBAL\.article\.category\s*=\s*({.*?});/);
          if (match && match[1]) {
            const catObj = JSON.parse(match[1]);
            if (catObj && catObj.name) {
              dtGlobalCategoryName = catObj.name;
            }
          }
        } catch (e) {}
      }
    });
  }

  // ── Category ──────────────────────
  let category = jsonLdCategory;
  if (!category && dtGlobalArticle) {
    const catName = dtGlobalArticle.category?.name || dtGlobalCategoryName;
    if (catName) {
      category = `#${catName}`;
    }
  }
  if (!category) {
    if (url.includes('dantri.com.vn')) {
      const breadcrumbs = $('.breadcrumbs, .breadcrumb, .dt-breadcrumb');
      if (breadcrumbs.length) {
        const lastBreadcrumb = breadcrumbs.find('a, li').last();
        category = cleanText(lastBreadcrumb.text());
      }
    } else if (url.includes('tuoitre.vn')) {
      category = cleanText($('.detail-cate, .category').first().text());
    }

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
    } else {
      category = category.startsWith('#') ? category : `#${category}`;
    }
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

  if (!title && dtGlobalArticle?.title) {
    title = cleanText(dtGlobalArticle.title);
  }
  if (!title) {
    title = cleanText(raw.title || $('title').text().replace(/ - Góc Nhìn Mới.*/i, ''));
  }

  // ── Description / sapo ────────────────────────────────────────────────
  let description = jsonLdDescription;
  if (!description) {
    if (url.includes('dantri.com.vn')) {
      description = cleanText($('h2.sapo, h2.sing-sapo, h2.detail-sapo').first().text()) || 
                    cleanText($('h2').first().text());
    } else if (url.includes('tuoitre.vn')) {
      description = cleanText($('.detail-sapo, .sapo').first().text());
    }

    if (!description) {
      // Try h4 (often used as sapo in Spotlight layouts)
      const h4Text = cleanText($('h4').first().text());
      description = cleanText(scope.find('p.mb-5').first().text()) || h4Text ||
        cleanText($('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '');
    }
  }

  if (!description && dtGlobalArticle?.sapo) {
    description = cleanText(dtGlobalArticle.sapo);
  }
  if (!description && raw.metadata?.description) {
    description = cleanText(raw.metadata.description);
  }

  // ── Author ────────────────────────────────────────────────────────────
  let author = jsonLdAuthor;
  if (!author) {
    if (url.includes('dantri.com.vn')) {
      author = cleanText($('.author-name, .author, .tac-gia').first().text());
    } else if (url.includes('tuoitre.vn')) {
      author = cleanText($('.detail-author, .author-info, .author, .tac-gia').first().text());
    }

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
  }

  if (!author && dtGlobalArticle) {
    const listAuthor = dtGlobalArticle.listAuthor;
    if (Array.isArray(listAuthor) && listAuthor.length > 0) {
      author = cleanText(listAuthor[0].authorName || '');
    }
  }

  // ── Published date ────────────────────────────────────────────────────
  let rawPublishedAt = '';
  if (url.includes('dantri.com.vn')) {
    rawPublishedAt = cleanText($('.author-time, .pub-date, .date').first().text());
  } else if (url.includes('tuoitre.vn')) {
    rawPublishedAt = cleanText($('.detail-time, .date, .time').first().text());
  }

  if (!rawPublishedAt) {
    rawPublishedAt = cleanText(
      scope.find('.article-date, .post-date, .date, .time, time, p.text-gray-400, span.text-gray-500').first().text() ||
      $('.article-date, .post-date, .date, .time, time, p.text-gray-400, span.text-gray-500').first().text() || ''
    );
  }
  if (!rawPublishedAt) {
    rawPublishedAt = jsonLdPublishedAt;
  }
  if (!rawPublishedAt && dtDistributionDate) {
    rawPublishedAt = dtDistributionDate;
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
  const isSpotlight = (layout === 'dmagazine' || layout === 'megastory' || layout === 'tamdiem') && 
                      $('#html_content').length === 0 &&
                      !url.includes('dantri.com.vn') &&
                      !url.includes('tuoitre.vn');
  let spotlightFullText = '';

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
        let imgUrl = block.attr('data-url') || block.attr('data-src') || block.attr('src') || '';
        if (imgUrl) {
          imgUrl = resolveUrl(imgUrl, raw.url);
          const caption = cleanCaption(block.attr('data-caption') || block.attr('alt'));
          if (!isInvalidImage(imgUrl, caption)) {
            images.push({ url: imgUrl, caption });
            bodyBlocks.push({ type: 'image', url: imgUrl, caption });
          }
        }
      }
    });
  } else if (isSpotlight) {
    console.log('   📰 Phát hiện bài viết dạng Spotlight/E-Magazine. Đang cào các section...');
    const seenImageUrls = new Set<string>();
    const textSegments: string[] = [];

    $('section').each((_, el) => {
      const sec = $(el);
      if (sec.closest('header, footer, nav, aside').length > 0) return;

      const className = sec.attr('class') || '';
      const id = sec.attr('id') || '';
      if (/header|footer|comment|related|sidebar|nav/i.test(className) || /header|footer|comment|related|sidebar|nav/i.test(id)) {
        return;
      }

      // Extract text segments for full_text
      sec.find('p, h2, h3').each((_, textEl) => {
        const text = cleanText($(textEl).text());
        if (text && text.length > 20 && !textSegments.includes(text)) {
          textSegments.push(text);
        }
      });

      let html = sec.html() || '';
      const cleanSec = cheerio.load(html);
      cleanSec('script, iframe, noscript, style').remove();

      // Normalize images inside section
      cleanSec('img').each((_, imgEl) => {
        const img = cleanSec(imgEl);
        let src = img.attr('data-original') ||
                  img.attr('data-src') ||
                  img.attr('data-lazy-src') ||
                  img.attr('data-cke-saved-src') ||
                  img.attr('src') || '';

        if (src && src.startsWith('/') && !src.startsWith('//')) {
          try {
            const parsedUrl = new URL(raw.url);
            src = `${parsedUrl.origin}${src}`;
            img.attr('src', src);
          } catch (e) {
            // ignore
          }
        }

        const alt = cleanCaption(img.attr('alt'));
        const titleAttr = cleanCaption(img.attr('title'));
        if (isInvalidImage(src, alt, titleAttr)) {
          return;
        }

        img.removeClass('opacity-0');
        img.css('opacity', '1');
        img.removeAttr('loading');

        if (src) {
          seenImageUrls.add(src);
          images.push({ url: src, caption: alt });
        }
      });

      html = cleanSec.html() || '';
      const style = sec.attr('style') || '';

      bodyBlocks.push({
        type: 'section',
        className,
        style,
        html
      });
    });

    spotlightFullText = textSegments.join('\n\n');
  } else {

    // ── Goc Nhin Moi (data-content-type) ──
    const contentRoot2 = $('#html_content');
    if (contentRoot2.length && contentRoot2.find('[data-content-type]').length > 0) {
      contentRoot2.find('[data-content-type]').each((_, el) => {
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
          let imgUrl = block.attr('data-url') || block.attr('data-src') || block.attr('src') || '';
          if (imgUrl) {
            imgUrl = resolveUrl(imgUrl, raw.url);
            const caption = cleanCaption(block.attr('data-caption') || block.attr('alt'));
            if (!isInvalidImage(imgUrl, caption)) {
              images.push({ url: imgUrl, caption });
              bodyBlocks.push({ type: 'image', url: imgUrl, caption });
            }
          }
        }
      });
    } else {

    // Fallback: parse generic p/h2/h3/div tags and images in DOM order within the determined scope
    const seenTexts = new Set<string>();
    const seenImageUrls = new Set<string>();

    // Try to find the specific body container first to exclude header/footer/sidebar/author elements across Tuoi Tre, Dantri, Goc Nhin Moi
    let bodyContainer = $('#html_content, [itemprop="articleBody"], .detail-content, .detail-cmain, .article-content, .content-detail, .e-magazine, .e-magazine__body, .dmagazine-container').first();
    if (!bodyContainer.length) {
      bodyContainer = scope;
    }

    bodyContainer.find('p, h2, h3, img, div.content-body, div.article-body, div.post-content').each((_, el) => {
      const tagName = (el as any).tagName || el.name;
      const cheerioEl = $(el);

      // Skip related news sections, ads, author info boxes & sidebar elements
      const isExcludedSection = cheerioEl.parents('[class*="related"], [id*="related"], [class*="recommend"], [class*="relate"], .tin-lien-quan, .box-lien-quan, [type*="Related"], [type*="related"], [class*="author"], [class*="tac-gia"], [class*="sidebar"], [class*="banner"], [class*="ads"]').length > 0 ||
                                cheerioEl.is('[class*="related"], [id*="related"], [class*="recommend"], [class*="relate"], .tin-lien-quan, .box-lien-quan, [type*="Related"], [type*="related"], [class*="author"], [class*="tac-gia"], [class*="sidebar"], [class*="banner"], [class*="ads"]');
      if (isExcludedSection) {
        return;
      }

      // Avoid matching parent elements whose children will be parsed individually to prevent duplicate text blocks
      if (tagName !== 'img' && cheerioEl.find('p, h2, h3').length > 0) {
        return;
      }

      // Avoid matching tags section or tag links
      const className = cheerioEl.attr('class') || '';
      const id = cheerioEl.attr('id') || '';
      const tagRegex = /(^|[-_])tags?([-_]|$)/i;
      if (
        tagRegex.test(className) || 
        tagRegex.test(id) || 
        cheerioEl.parents('[class*="tag"], [id*="tag"]').length > 0 ||
        cheerioEl.find('a[href*="/tag/"]').length > 0 ||
        (tagName === 'a' && (cheerioEl.attr('href')?.includes('/tag/') || cheerioEl.attr('href')?.includes('/hashtag/')))
      ) {
        return;
      }

      if (tagName === 'img') {
        let src = cheerioEl.attr('data-original') || 
                  cheerioEl.attr('data-src') || 
                  cheerioEl.attr('data-lazy-src') || 
                  cheerioEl.attr('data-cke-saved-src') || 
                  cheerioEl.attr('src') || '';

        if (src && src.startsWith('/') && !src.startsWith('//')) {
          try {
            const parsedUrl = new URL(raw.url);
            src = `${parsedUrl.origin}${src}`;
          } catch (e) {
            // ignore
          }
        }

        const alt = cleanCaption(cheerioEl.attr('alt'));
        const titleAttr = cleanCaption(cheerioEl.attr('title'));

        if (isInvalidImage(src, alt, titleAttr)) {
          return;
        }

        // Check if this image is the author's avatar/portrait (Phân biệt cả ảnh Avatar tác giả cho Dân trí, Tuổi Trẻ, Góc Nhìn Mới)
        const isAuthorImage = 
          (alt && author && alt.toLowerCase().includes(author.toLowerCase())) ||
          (titleAttr && author && titleAttr.toLowerCase().includes(author.toLowerCase())) ||
          cheerioEl.parents('[class*="author-avatar"], [class*="author-img"], [class*="author-image"], [class*="avatar"], [class*="detail-author"], .tac-gia, .author-info, .author').length > 0 ||
          cheerioEl.is('[class*="author-avatar"], [class*="author-img"], [class*="author-image"], [class*="avatar"]');

        if (isAuthorImage) {
          if (!author_image_url) {
            author_image_url = src;
            console.log(`   👤 Phát hiện ảnh đại diện tác giả: ${src}`);
          }
          return; // Skip adding to body images
        }

        if (!seenImageUrls.has(src)) {
          seenImageUrls.add(src);
          images.push({ url: src, caption: alt });
          bodyBlocks.push({ type: 'image', url: src, caption: alt });
        }
      } else {
        const text = cleanText(cheerioEl.text());
        if (isBoilerplateText(text, author, published_at, category, title, description)) {
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

    }

  // ── Fallback image from og:image if no body images found ─────────────
  if (images.length === 0) {
    let ogImg = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
    if (!ogImg && raw.metadata?.['og:image']) {
      ogImg = raw.metadata['og:image'];
    }
    if (ogImg) {
      ogImg = resolveUrl(ogImg, raw.url);
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

  const full_text = isSpotlight ? spotlightFullText : bodyBlocks
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
    author_image_url,
  };
}
