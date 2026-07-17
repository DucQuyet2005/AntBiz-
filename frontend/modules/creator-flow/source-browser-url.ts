export type CreatorNewsSource = 'gocnhinmoi' | 'tuoitre' | 'dantri';

const SOURCE_BASE_URLS: Record<CreatorNewsSource, string> = {
  gocnhinmoi: 'https://gocnhinmoi.com.vn',
  tuoitre: 'https://tuoitre.vn',
  dantri: 'https://dantri.com.vn',
};

export type CreatorArticleUrlValidation =
  | { valid: true; url: string }
  | { valid: false; message: string };

export function getCreatorSourceBaseUrl(source: CreatorNewsSource) {
  return SOURCE_BASE_URLS[source];
}

export function normalizeCreatorSourceUrl(
  source: CreatorNewsSource,
  value: string
): string | null {
  try {
    const url = new URL(value);
    const allowedHost = new URL(SOURCE_BASE_URLS[source]).hostname;
    if (
      url.protocol !== 'https:'
      || url.username
      || url.password
      || (url.hostname !== allowedHost && !url.hostname.endsWith(`.${allowedHost}`))
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

export function validateCreatorArticleUrl(
  source: CreatorNewsSource,
  value: string
): CreatorArticleUrlValidation {
  const normalized = normalizeCreatorSourceUrl(source, value);
  if (!normalized) {
    return { valid: false, message: 'URL không hợp lệ hoặc không thuộc nguồn đã chọn.' };
  }
  const url = new URL(normalized);
  if (url.pathname === '/') {
    return { valid: false, message: 'Hãy mở một bài viết cụ thể trước khi chọn.' };
  }
  return { valid: true, url: normalized };
}
