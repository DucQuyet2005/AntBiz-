import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CaptionExportModule } from '@/backend/modules/caption-export/caption-export-module';
import type {
  CaptionCsvSerializer,
  CaptionExportActor,
  CaptionExportRepository,
  ExportJobStore,
} from '@/backend/modules/caption-export/caption-export-types';

const JOB_ID = '123e4567-e89b-12d3-a456-426614174000';
const marketer: CaptionExportActor = { id: 'user-1', role: 'marketer_full' };

describe('CaptionExportModule', () => {
  let repository: CaptionExportRepository;
  let jobStore: ExportJobStore;
  let serializer: CaptionCsvSerializer;
  let exportModule: CaptionExportModule;

  beforeEach(() => {
    repository = {
      count: vi.fn().mockResolvedValue(1),
      list: vi.fn().mockResolvedValue([{ id: 'caption-1' }]),
    };
    jobStore = {
      create: vi.fn().mockResolvedValue({
        id: JOB_ID,
        actorId: 'user-1',
        action: 'export_csv_job',
        afterValue: { filters: {} },
        createdAt: '2026-07-15T00:00:00.000Z',
      }),
      complete: vi.fn().mockResolvedValue(undefined),
      fail: vi.fn().mockResolvedValue(undefined),
      find: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
    };
    serializer = { serialize: vi.fn().mockReturnValue('csv-content') };
    exportModule = new CaptionExportModule(repository, jobStore, serializer);
  });

  it('creates, serializes, completes, and returns a synchronous export artifact', async () => {
    const result = await exportModule.create(marketer, {
      platform: ' Facebook ', search: ' campaign ',
    });

    expect(repository.count).toHaveBeenCalledWith({
      platform: 'facebook', search: 'campaign', startDate: undefined, endDate: undefined,
    });
    expect(jobStore.create).toHaveBeenCalledWith('user-1', expect.objectContaining({
      platform: 'facebook', search: 'campaign',
    }));
    expect(repository.list).toHaveBeenCalledWith(expect.any(Object), 1);
    expect(jobStore.complete).toHaveBeenCalledWith(
      JOB_ID,
      `/api/captions/export/download?jobId=${JOB_ID}`,
      1
    );
    expect(result).toEqual({
      csv: 'csv-content',
      jobId: JOB_ID,
      filename: 'antbiz_export_123e4567.csv',
    });
    expect(vi.mocked(repository.count).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(jobStore.create).mock.invocationCallOrder[0]);
    expect(vi.mocked(jobStore.create).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(repository.list).mock.invocationCallOrder[0]);
  });

  it('uses the established 1000-row fallback after an empty count', async () => {
    vi.mocked(repository.count).mockResolvedValue(0);
    await exportModule.create(marketer, {});
    expect(repository.list).toHaveBeenCalledWith(expect.any(Object), 1000);
  });

  it('records a safe failed status after a post-creation repository failure', async () => {
    vi.mocked(repository.list).mockRejectedValue(new Error('database secret'));
    await expect(exportModule.create(marketer, {})).rejects.toThrow('database secret');
    expect(jobStore.fail).toHaveBeenCalledWith(JOB_ID, 'Export failed');
  });

  it('does not let failed-status persistence hide the original export error', async () => {
    const original = new Error('original export failure');
    vi.mocked(repository.list).mockRejectedValue(original);
    vi.mocked(jobStore.fail).mockRejectedValue(new Error('status failure'));
    await expect(exportModule.create(marketer, {})).rejects.toBe(original);
  });

  it('does not create or fail a job when counting fails first', async () => {
    vi.mocked(repository.count).mockRejectedValue(new Error('count failed'));
    await expect(exportModule.create(marketer, {})).rejects.toThrow('count failed');
    expect(jobStore.create).not.toHaveBeenCalled();
    expect(jobStore.fail).not.toHaveBeenCalled();
  });

  it('downloads an owned job with defensively parsed stored filters', async () => {
    vi.mocked(jobStore.find).mockResolvedValue({
      id: JOB_ID,
      actorId: 'user-1',
      action: 'export_csv_job',
      afterValue: { filters: { platform: 'Threads' }, row_count: 25 },
      createdAt: '2026-07-15T00:00:00.000Z',
    });
    const result = await exportModule.download(marketer, JOB_ID);
    expect(repository.list).toHaveBeenCalledWith({
      platform: 'threads', search: undefined, startDate: undefined, endDate: undefined,
    }, 25);
    expect(result.filename).toBe('antbiz_export_123e4567.csv');
  });

  it('allows an administrator to download another user job', async () => {
    vi.mocked(jobStore.find).mockResolvedValue({
      id: JOB_ID, actorId: 'other-user', action: 'export_csv_job',
      afterValue: { filters: {}, row_count: 1 }, createdAt: '2026-07-15T00:00:00.000Z',
    });
    await expect(exportModule.download({ id: 'admin-1', role: 'admin' }, JOB_ID)).resolves
      .toMatchObject({ jobId: JOB_ID });
  });

  it('rejects missing jobs and downloads owned by another user', async () => {
    vi.mocked(jobStore.find).mockResolvedValueOnce(null);
    await expect(exportModule.download(marketer, JOB_ID)).rejects.toMatchObject({ status: 404 });

    vi.mocked(jobStore.find).mockResolvedValueOnce({
      id: JOB_ID, actorId: 'other-user', action: 'export_csv_job',
      afterValue: {}, createdAt: '2026-07-15T00:00:00.000Z',
    });
    await expect(exportModule.download(marketer, JOB_ID)).rejects.toMatchObject({ status: 403 });
  });

  it('lists only jobs requested for the current actor ID', async () => {
    await exportModule.list(marketer);
    expect(jobStore.list).toHaveBeenCalledWith('user-1');
  });
});
