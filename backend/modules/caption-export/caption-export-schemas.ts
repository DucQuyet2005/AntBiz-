import { CaptionExportError } from './caption-export-errors';
import type {
  CaptionExportFilters,
  RawCaptionExportFilters,
} from './caption-export-types';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseCaptionExportFilters(
  raw: RawCaptionExportFilters
): CaptionExportFilters {
  return normalizeFilters(raw, validation);
}

export function parseStoredCaptionExportFilters(value: unknown): CaptionExportFilters {
  if (value === undefined || value === null) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalidJobData();

  const source = value as Record<string, unknown>;
  const raw: RawCaptionExportFilters = {};
  for (const field of ['platform', 'search', 'startDate', 'endDate'] as const) {
    const fieldValue = source[field];
    if (fieldValue !== undefined && fieldValue !== null && typeof fieldValue !== 'string') {
      throw invalidJobData();
    }
    raw[field] = fieldValue as string | null | undefined;
  }

  return normalizeFilters(raw, invalidJobData);
}

export function parseCaptionExportJobId(value: string | null | undefined) {
  const jobId = value?.trim() ?? '';
  if (!UUID.test(jobId)) {
    throw validation('Mã yêu cầu xuất dữ liệu không hợp lệ');
  }
  return jobId;
}

export function parseStoredRowCount(value: unknown) {
  if (value === undefined || value === null) return 1000;
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw invalidJobData();
  return (value as number) > 0 ? value as number : 1000;
}

function normalizeFilters(
  raw: RawCaptionExportFilters,
  errorFactory: (message?: string) => CaptionExportError
) {
  const platformValue = raw.platform?.trim();
  const platform = !platformValue || platformValue.toLowerCase() === 'all platforms'
    ? undefined
    : platformValue.toLowerCase();
  if (platform && platform.length > 50) {
    throw errorFactory('Nền tảng không được vượt quá 50 ký tự');
  }

  const search = normalizeSearch(raw.search);
  if (search && search.length > 200) {
    throw errorFactory('Từ khóa tìm kiếm không được vượt quá 200 ký tự');
  }

  const startDate = parseDateBoundary(raw.startDate, 'startDate', false, errorFactory);
  const endDate = parseDateBoundary(raw.endDate, 'endDate', true, errorFactory);
  if (startDate && endDate && Date.parse(startDate) > Date.parse(endDate)) {
    throw errorFactory('Khoảng ngày không hợp lệ: startDate phải trước hoặc bằng endDate');
  }

  return { platform, search, startDate, endDate } satisfies CaptionExportFilters;
}

function normalizeSearch(value: string | null | undefined) {
  const normalized = value?.trim().replace(/"/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized || undefined;
}

function parseDateBoundary(
  value: string | null | undefined,
  field: 'startDate' | 'endDate',
  endOfDay: boolean,
  errorFactory: (message?: string) => CaptionExportError
) {
  const input = value?.trim();
  if (!input) return undefined;

  if (DATE_ONLY.test(input)) {
    if (!isValidCalendarDate(input)) throw errorFactory(`${field} không phải ngày ISO hợp lệ`);
    return `${input}${endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`;
  }

  if (!ISO_TIMESTAMP.test(input) || !isValidCalendarDate(input.slice(0, 10))) {
    throw errorFactory(`${field} không phải timestamp ISO hợp lệ`);
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) throw errorFactory(`${field} không phải timestamp ISO hợp lệ`);
  return parsed.toISOString();
}

function isValidCalendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function validation(message = 'Bộ lọc xuất dữ liệu không hợp lệ') {
  return new CaptionExportError('VALIDATION', 400, message);
}

function invalidJobData() {
  return new CaptionExportError(
    'INVALID_JOB_DATA',
    500,
    'Không thể đọc yêu cầu xuất dữ liệu'
  );
}
