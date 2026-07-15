import type { AuditLog, AuditLogRow, AuditRelation } from './audit-reporting-types';

export function projectAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    action: row.action,
    before_value: row.before_value,
    after_value: row.after_value,
    created_at: row.created_at,
    actor_email: relationEmail(row.actor, 'System'),
    target_email: relationEmail(row.target, 'Unknown'),
  };
}

function relationEmail(relation: AuditRelation, fallback: string) {
  const value = Array.isArray(relation) ? relation[0] : relation;
  return value && typeof value.email === 'string' && value.email.trim()
    ? value.email
    : fallback;
}
