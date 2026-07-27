import { describe, expect, it } from 'vitest';
import { projectAuditLog } from '@/backend/modules/audit-reporting/audit-log-projection';
import type { AuditLogRow } from '@/backend/modules/audit-reporting/audit-reporting-types';

describe('Audit Log projection', () => {
  it('extracts emails from object and array relations', () => {
    expect(projectAuditLog(row({
      actor: { email: 'actor@example.com' },
      target: [{ email: 'target@example.com' }],
    }))).toMatchObject({
      actor_email: 'actor@example.com', target_email: 'target@example.com',
    });
  });

  it('uses stable fallbacks for missing relations', () => {
    expect(projectAuditLog(row({ actor: null, target: [] }))).toMatchObject({
      actor_email: 'System', target_email: 'Unknown',
    });
  });

  it('preserves before and after JSON values unchanged', () => {
    const before = { role: 'marketer_full' };
    const after = { role: 'admin', nested: ['value'] };
    const projected = projectAuditLog(row({ before_value: before, after_value: after }));
    expect(projected.before_value).toBe(before);
    expect(projected.after_value).toBe(after);
  });
});

function row(overrides: Partial<AuditLogRow> = {}): AuditLogRow {
  return {
    id: 'log-1', action: 'change_role', before_value: null, after_value: null,
    created_at: '2026-07-15T00:00:00.000Z', actor: null, target: null, ...overrides,
  };
}
