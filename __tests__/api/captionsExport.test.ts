import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET as createExport } from '@/app/api/captions/export/route';
import { GET as downloadExport } from '@/app/api/captions/export/download/route';
import { GET as listExportJobs } from '@/app/api/export-jobs/route';
import { CaptionExportError } from '@/backend/modules/caption-export';
import { requireUserWithRole } from '@/lib/api/auth';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  download: vi.fn(),
  list: vi.fn(),
  factory: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({ requireUserWithRole: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock('@/backend/modules/caption-export', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/backend/modules/caption-export')>(),
  createCaptionExportModule: mocks.factory,
}));

const userSupabase = { client: 'user' };
const adminSupabase = { client: 'admin' };

describe('Caption Export Route Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.factory.mockReturnValue({
      create: mocks.create,
      download: mocks.download,
      list: mocks.list,
    });
    mocks.createAdminClient.mockReturnValue(adminSupabase);
    vi.mocked(requireUserWithRole).mockResolvedValue({
      user: { id: 'user-1' },
      role: 'marketer_full',
      supabase: userSupabase,
      unauthorized: null,
    } as never);
  });

  it('returns the existing auth response before building the module', async () => {
    vi.mocked(requireUserWithRole).mockResolvedValue({
      unauthorized: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    } as never);
    const response = await createExport(request('/api/captions/export'));
    expect(response.status).toBe(403);
    expect(mocks.factory).not.toHaveBeenCalled();
  });

  it('creates an immediate CSV export with the established headers', async () => {
    mocks.create.mockResolvedValue({
      csv: '\ufeffcsv-content',
      jobId: '123e4567-e89b-12d3-a456-426614174000',
      filename: 'antbiz_export_123e4567.csv',
    });
    const response = await createExport(request(
      '/api/captions/export?platform=facebook&search=campaign&startDate=2026-07-01&endDate=2026-07-15'
    ));

    expect(response.status).toBe(200);
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3))).toBe('csv-content');
    expect(response.headers.get('Content-Type')).toContain('text/csv');
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="antbiz_export_123e4567.csv"'
    );
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    expect(mocks.factory).toHaveBeenCalledWith(userSupabase, adminSupabase);
    expect(mocks.create).toHaveBeenCalledWith(
      { id: 'user-1', role: 'marketer_full' },
      {
        platform: 'facebook', search: 'campaign',
        startDate: '2026-07-01', endDate: '2026-07-15',
      }
    );
  });

  it('maps create validation errors to a JSON 400 response', async () => {
    mocks.create.mockRejectedValue(
      new CaptionExportError('VALIDATION', 400, 'Bộ lọc không hợp lệ')
    );
    const response = await createExport(request('/api/captions/export'));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Bộ lọc không hợp lệ' });
  });

  it('downloads a regenerated CSV using jobId and a text error contract', async () => {
    mocks.download.mockResolvedValueOnce({
      csv: 'download-csv', filename: 'antbiz_export_123e4567.csv',
    });
    const success = await downloadExport(request(
      '/api/captions/export/download?jobId=123e4567-e89b-12d3-a456-426614174000'
    ));
    expect(success.status).toBe(200);
    expect(await success.text()).toBe('download-csv');
    expect(mocks.download).toHaveBeenCalledWith(
      { id: 'user-1', role: 'marketer_full' },
      '123e4567-e89b-12d3-a456-426614174000'
    );

    mocks.download.mockRejectedValueOnce(
      new CaptionExportError('NOT_FOUND', 404, 'Không tìm thấy yêu cầu xuất dữ liệu tương ứng')
    );
    const missing = await downloadExport(request(
      '/api/captions/export/download?jobId=123e4567-e89b-12d3-a456-426614174000'
    ));
    expect(missing.status).toBe(404);
    expect(await missing.text()).toBe('Không tìm thấy yêu cầu xuất dữ liệu tương ứng');
  });

  it('maps download ownership failures to text 403', async () => {
    mocks.download.mockRejectedValue(
      new CaptionExportError('FORBIDDEN', 403, 'Bạn không có quyền tải tài liệu này')
    );
    const response = await downloadExport(request('/api/captions/export/download'));
    expect(response.status).toBe(403);
    expect(await response.text()).toBe('Bạn không có quyền tải tài liệu này');
  });

  it('preserves the export history { data } response contract', async () => {
    mocks.list.mockResolvedValue([{ id: 'job-1', status: 'completed' }]);
    const response = await listExportJobs();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [{ id: 'job-1', status: 'completed' }],
    });
    expect(mocks.list).toHaveBeenCalledWith({ id: 'user-1', role: 'marketer_full' });
  });

  it('does not leak unexpected error details', async () => {
    mocks.list.mockRejectedValue(new Error('database secret'));
    const response = await listExportJobs();
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('database secret');
  });
});

function request(path: string) {
  return new NextRequest(`http://localhost${path}`);
}
