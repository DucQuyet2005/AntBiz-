import { describe, expect, it } from 'vitest';
import {
  parseCaptionExportFilters,
  parseCaptionExportJobId,
  parseStoredCaptionExportFilters,
  parseStoredRowCount,
} from '@/backend/modules/caption-export/caption-export-schemas';

describe('Caption Export schemas', () => {
  it('normalizes filters, quote characters, and date-only boundaries', () => {
    expect(parseCaptionExportFilters({
      platform: ' Facebook ',
      search: '  say "hello"   now  ',
      startDate: '2026-07-01',
      endDate: '2026-07-15',
    })).toEqual({
      platform: 'facebook',
      search: 'say hello now',
      startDate: '2026-07-01T00:00:00.000Z',
      endDate: '2026-07-15T23:59:59.999Z',
    });
  });

  it('treats All Platforms and quote-only searches as absent filters', () => {
    expect(parseCaptionExportFilters({ platform: 'All Platforms', search: ' "" ' })).toEqual({
      platform: undefined,
      search: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  });

  it.each([
    [{ search: 'x'.repeat(201) }, /200/],
    [{ platform: 'x'.repeat(51) }, /50/],
    [{ startDate: '2026-02-30' }, /startDate/],
    [{ endDate: 'not-a-date' }, /endDate/],
    [{ startDate: '2026-07-16', endDate: '2026-07-15' }, /Khoảng ngày/],
  ] as const)('rejects invalid filters %#', (filters, message) => {
    expect(() => parseCaptionExportFilters(filters)).toThrow(message);
  });

  it('validates export job UUIDs', () => {
    expect(parseCaptionExportJobId(' 123e4567-e89b-12d3-a456-426614174000 ')).toBe(
      '123e4567-e89b-12d3-a456-426614174000'
    );
    expect(() => parseCaptionExportJobId('job-1')).toThrow(/không hợp lệ/);
  });

  it('parses stored filters defensively', () => {
    expect(parseStoredCaptionExportFilters({ platform: ' Threads ', search: ' campaign ' }))
      .toMatchObject({ platform: 'threads', search: 'campaign' });
    expect(() => parseStoredCaptionExportFilters({ search: 42 })).toThrowError(
      expect.objectContaining({ code: 'INVALID_JOB_DATA', status: 500 })
    );
  });

  it('parses stored row counts with the established zero fallback', () => {
    expect(parseStoredRowCount(25)).toBe(25);
    expect(parseStoredRowCount(0)).toBe(1000);
    expect(parseStoredRowCount(undefined)).toBe(1000);
    expect(() => parseStoredRowCount(-1)).toThrowError(
      expect.objectContaining({ code: 'INVALID_JOB_DATA' })
    );
  });
});
