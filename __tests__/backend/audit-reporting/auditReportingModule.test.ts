import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditReportingModule } from '@/backend/modules/audit-reporting/audit-reporting-module';
import type {
  AuditLogRow,
  AuditReportingRepository,
} from '@/backend/modules/audit-reporting/audit-reporting-types';

describe('AuditReportingModule', () => {
  let repository: AuditReportingRepository;
  let auditModule: AuditReportingModule;

  beforeEach(() => {
    repository = { list: vi.fn().mockResolvedValue({ data: [], count: 0 }) };
    auditModule = new AuditReportingModule(repository);
  });

  it('delegates normalized filters and returns pagination metadata', async () => {
    vi.mocked(repository.list).mockResolvedValue({ data: [row()], count: 21 });
    const result = await auditModule.list({
      action: ' change_role ', from: '2026-07-01', to: '2026-07-15',
      page: '2', limit: '10',
    });
    expect(repository.list).toHaveBeenCalledWith({
      action: 'change_role',
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-15T23:59:59.999Z',
      page: 2,
      limit: 10,
    });
    expect(result.meta).toEqual({ total: 21, page: 2, limit: 10, totalPages: 3 });
    expect(result.data[0]).toMatchObject({
      id: 'log-1', actor_email: 'actor@example.com', target_email: 'Unknown',
    });
  });

  it('returns an empty report with zero total pages', async () => {
    await expect(auditModule.list({ limit: '5' })).resolves.toEqual({
      data: [], meta: { total: 0, page: 1, limit: 5, totalPages: 0 },
    });
  });
});

function row(): AuditLogRow {
  return {
    id: 'log-1', action: 'change_role', before_value: {}, after_value: {},
    created_at: '2026-07-15T00:00:00.000Z',
    actor: { email: 'actor@example.com' }, target: null,
  };
}
