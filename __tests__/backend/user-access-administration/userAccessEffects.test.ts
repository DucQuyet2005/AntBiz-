import { describe, expect, it, vi } from 'vitest';
import { ProductionUserAccessEffects } from '@/backend/modules/user-access-administration/user-access-effects';

describe('ProductionUserAccessEffects', () => {
  it('maps a role change to audit, admin notifications, and broadcast', async () => {
    const { supabase, auditInsert } = fakeSupabase();
    const dependencies = fakeDependencies();
    const effects = new ProductionUserAccessEffects(supabase as never, dependencies);
    await effects.roleChanged({
      actor: { id: 'a1', email: 'admin@example.com' },
      target: target(), previousRole: 'marketer_full', role: 'admin',
    });
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({ action: 'change_role' }));
    expect(dependencies.createNotifications).toHaveBeenCalledWith([
      expect.objectContaining({ userId: 'a1', metadata: expect.objectContaining({ new_role: 'admin' }) }),
    ]);
    expect(dependencies.broadcast).toHaveBeenCalledWith('u2', { role: 'admin' });
  });

  it('maps a lock to audit, email, notifications, and status broadcast', async () => {
    const { supabase, auditInsert } = fakeSupabase();
    const dependencies = fakeDependencies();
    const effects = new ProductionUserAccessEffects(supabase as never, dependencies);
    await effects.statusChanged({
      actor: { id: 'a1', email: 'admin@example.com' }, target: target(),
      previousStatus: 'active', status: 'locked', lockedReason: 'Repeated policy abuse',
    });
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({ action: 'lock_account' }));
    expect(dependencies.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user@example.com',
    }));
    expect(dependencies.broadcast).toHaveBeenCalledWith('u2', {
      status: 'locked', locked_reason: 'Repeated policy abuse',
    });
  });

  it('contains and logs each failed supporting task', async () => {
    const { supabase } = fakeSupabase({ auditError: new Error('audit unavailable') });
    const dependencies = fakeDependencies();
    dependencies.createNotifications.mockRejectedValue(new Error('notification unavailable'));
    dependencies.broadcast.mockRejectedValue(new Error('realtime unavailable'));
    dependencies.sendEmail.mockResolvedValue({ success: false, error: 'email unavailable' });
    const effects = new ProductionUserAccessEffects(supabase as never, dependencies);
    await expect(effects.statusChanged({
      actor: { id: 'a1', email: 'admin@example.com' }, target: target(),
      previousStatus: 'active', status: 'locked', lockedReason: 'Repeated policy abuse',
    })).resolves.toBeUndefined();
    expect(dependencies.logger.error).toHaveBeenCalledTimes(4);
  });
});

function fakeSupabase(options: { auditError?: Error } = {}) {
  const auditInsert = vi.fn().mockResolvedValue({ error: options.auditError || null });
  const adminEq = vi.fn().mockResolvedValue({ data: [{ id: 'a1' }], error: null });
  const from = vi.fn((table: string) => table === 'audit_logs'
    ? { insert: auditInsert }
    : { select: vi.fn(() => ({ eq: adminEq })) });
  return { supabase: { from }, auditInsert };
}

function fakeDependencies() {
  return {
    createNotifications: vi.fn().mockResolvedValue([]),
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
    broadcast: vi.fn().mockResolvedValue(undefined),
    logger: { error: vi.fn() },
  };
}

function target() {
  return {
    id: 'u2', email: 'user@example.com', role: 'marketer_full' as const,
    status: 'active' as const, locked_reason: null, locked_at: null, locked_by: null,
  };
}
