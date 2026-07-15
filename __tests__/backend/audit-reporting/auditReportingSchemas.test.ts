import { describe, expect, it } from 'vitest';
import { parseAuditReportInput } from '@/backend/modules/audit-reporting/audit-reporting-schemas';

describe('Audit Reporting schemas', () => {
  it('applies pagination defaults and removes the all action', () => {
    expect(parseAuditReportInput({ action: ' all ' })).toEqual({
      action: undefined, from: undefined, to: undefined, page: 1, limit: 20,
    });
  });

  it.each(['0', '-1', '1.5', 'abc'])('rejects invalid page %s', (page) => {
    expect(() => parseAuditReportInput({ page })).toThrowError(/số nguyên dương/);
  });

  it('accepts limit 100 and rejects larger values', () => {
    expect(parseAuditReportInput({ limit: '100' }).limit).toBe(100);
    expect(() => parseAuditReportInput({ limit: '101' })).toThrowError(/100/);
  });

  it('keeps an open, trimmed action taxonomy with a safe length cap', () => {
    expect(parseAuditReportInput({ action: '  export_csv_job  ' }).action)
      .toBe('export_csv_job');
    expect(() => parseAuditReportInput({ action: 'a'.repeat(101) })).toThrowError(/100 ký tự/);
  });

  it('expands date-only boundaries to the complete UTC range', () => {
    expect(parseAuditReportInput({ from: '2026-07-15', to: '2026-07-15' }))
      .toMatchObject({
        from: '2026-07-15T00:00:00.000Z',
        to: '2026-07-15T23:59:59.999Z',
      });
  });

  it('normalizes valid timestamp offsets to UTC', () => {
    expect(parseAuditReportInput({ from: '2026-07-15T07:00:00+07:00' }).from)
      .toBe('2026-07-15T00:00:00.000Z');
  });

  it.each(['not-a-date', '2026-02-30', '2026-02-30T10:00:00Z'])
  ('rejects invalid date %s', (from) => {
    expect(() => parseAuditReportInput({ from })).toThrowError(/không phải/);
  });

  it('rejects a reversed normalized date range', () => {
    expect(() => parseAuditReportInput({ from: '2026-07-16', to: '2026-07-15' }))
      .toThrowError(/from/);
  });
});
