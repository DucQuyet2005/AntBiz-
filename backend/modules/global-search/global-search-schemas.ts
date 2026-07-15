import { GlobalSearchError } from './global-search-errors';
import type {
  GlobalSearchInput,
  GlobalSearchLanguage,
  GlobalSearchRole,
  RawGlobalSearchInput,
} from './global-search-types';

const MAX_QUERY_LENGTH = 200;
const ALLOWED_ROLES = new Set<GlobalSearchRole>([
  'admin',
  'marketer_full',
  'marketer_content',
]);

export function parseGlobalSearchInput(raw: RawGlobalSearchInput): GlobalSearchInput {
  const query = raw.query?.trim() ?? '';
  if (!query) {
    throw new GlobalSearchError('VALIDATION', 400, 'Từ khóa tìm kiếm không hợp lệ');
  }
  if (query.length > MAX_QUERY_LENGTH) {
    throw new GlobalSearchError(
      'VALIDATION',
      400,
      `Từ khóa tìm kiếm không được vượt quá ${MAX_QUERY_LENGTH} ký tự`
    );
  }
  if (!ALLOWED_ROLES.has(raw.actor.role)) {
    throw new GlobalSearchError('FORBIDDEN', 403, 'Bạn không có quyền thực hiện tìm kiếm này');
  }

  return {
    query,
    language: normalizeLanguage(raw.language),
    actor: raw.actor,
  };
}

function normalizeLanguage(language: string | null | undefined): GlobalSearchLanguage {
  return language === 'en' ? 'en' : 'vi';
}
