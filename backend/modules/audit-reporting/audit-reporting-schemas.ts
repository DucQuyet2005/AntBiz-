import { AuditReportingError } from './audit-reporting-errors';
import type { AuditReportInput } from './audit-reporting-types';

type RawAuditReportInput = {
  action?: string | null;
  from?: string | null;
  to?: string | null;
  page?: string | null;
  limit?: string | null;
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export function parseAuditReportInput(raw: RawAuditReportInput): AuditReportInput {
  const action = parseAction(raw.action);
  const from = parseDateBoundary(raw.from, 'from', false);
  const to = parseDateBoundary(raw.to, 'to', true);
  if (from && to && Date.parse(from) > Date.parse(to)) {
    throw validation('Khoảng thời gian không hợp lệ: from phải trước hoặc bằng to');
  }
  return {
    action,
    from,
    to,
    page: parsePositiveInteger(raw.page, 1, 'page'),
    limit: parseLimit(raw.limit),
  };
}

function parseAction(value: string | null | undefined) {
  const action = value?.trim();
  if (!action || action === 'all') return undefined;
  if (action.length > 100) throw validation('action không được vượt quá 100 ký tự');
  return action;
}

function parseLimit(value: string | null | undefined) {
  const limit = parsePositiveInteger(value, 20, 'limit');
  if (limit > 100) throw validation('limit không được vượt quá 100');
  return limit;
}

function parsePositiveInteger(
  value: string | null | undefined,
  fallback: number,
  field: string
) {
  if (value === null || value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(value)) throw validation(`${field} phải là số nguyên dương`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw validation(`${field} phải là số nguyên dương`);
  }
  return parsed;
}

function parseDateBoundary(
  value: string | null | undefined,
  field: 'from' | 'to',
  endOfDay: boolean
) {
  const input = value?.trim();
  if (!input) return undefined;

  if (DATE_ONLY.test(input)) {
    const suffix = endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
    const parsed = new Date(`${input}${suffix}`);
    if (!isValidCalendarDate(input) || Number.isNaN(parsed.getTime())) {
      throw validation(`${field} không phải ngày ISO hợp lệ`);
    }
    return parsed.toISOString();
  }

  if (!ISO_TIMESTAMP.test(input) || !isValidCalendarDate(input.slice(0, 10))) {
    throw validation(`${field} không phải ngày hoặc timestamp ISO hợp lệ`);
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw validation(`${field} không phải ngày hoặc timestamp ISO hợp lệ`);
  }
  return parsed.toISOString();
}

function isValidCalendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function validation(message: string) {
  return new AuditReportingError('VALIDATION', 400, message);
}
