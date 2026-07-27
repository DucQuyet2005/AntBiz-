import { projectAuditLog } from './audit-log-projection';
import { parseAuditReportInput } from './audit-reporting-schemas';
import type { AuditReportingRepository } from './audit-reporting-types';

export class AuditReportingModule {
  constructor(private readonly repository: AuditReportingRepository) {}

  async list(rawInput: Parameters<typeof parseAuditReportInput>[0]) {
    const input = parseAuditReportInput(rawInput);
    const result = await this.repository.list(input);
    return {
      data: result.data.map(projectAuditLog),
      meta: {
        total: result.count,
        page: input.page,
        limit: input.limit,
        totalPages: result.count ? Math.ceil(result.count / input.limit) : 0,
      },
    };
  }
}
