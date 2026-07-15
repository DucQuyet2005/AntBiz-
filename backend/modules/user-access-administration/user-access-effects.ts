import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail, type EmailOptions } from '@/lib/email';
import { broadcastUserStatusChange } from '@/lib/services/broadcastService';
import { createNotifications } from '@/lib/services/notificationService';
import type {
  RoleChangedEvent,
  StatusChangedEvent,
  UserAccessEffects,
} from './user-access-administration-types';

type EffectDependencies = {
  createNotifications: typeof createNotifications;
  sendEmail: (options: EmailOptions) => Promise<{ success: boolean; error?: string }>;
  broadcast: typeof broadcastUserStatusChange;
  logger: Pick<Console, 'error'>;
};

const defaultDependencies: EffectDependencies = {
  createNotifications,
  sendEmail,
  broadcast: broadcastUserStatusChange,
  logger: console,
};

export class ProductionUserAccessEffects implements UserAccessEffects {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly dependencies: EffectDependencies = defaultDependencies
  ) {}

  async roleChanged(event: RoleChangedEvent) {
    await this.settle(event.target.id, [
      ['audit', this.insertAudit({
        actor_id: event.actor.id,
        target_user_id: event.target.id,
        action: 'change_role',
        before_value: { role: event.previousRole },
        after_value: { role: event.role },
      })],
      ['notifications', this.notifyAdmins(
        'Thay đổi vai trò người dùng',
        `Admin ${event.actor.email || 'không rõ'} đã thay đổi vai trò của người dùng ${event.target.email || 'không rõ'} từ ${event.previousRole} sang ${event.role}.`,
        {
          target_user_id: event.target.id,
          action_by: event.actor.id,
          old_role: event.previousRole,
          new_role: event.role,
        }
      )],
      ['broadcast', this.dependencies.broadcast(event.target.id, { role: event.role })],
    ]);
  }

  async statusChanged(event: StatusChangedEvent) {
    const isLock = event.status === 'locked';
    const tasks: Array<[string, Promise<unknown>]> = [
      ['audit', this.insertAudit({
        actor_id: event.actor.id,
        target_user_id: event.target.id,
        action: isLock ? 'lock_account' : 'unlock_account',
        before_value: { status: event.previousStatus },
        after_value: { status: event.status, reason: event.lockedReason },
      })],
      ['notifications', this.notifyAdmins(
        isLock ? 'Tài khoản bị khóa' : 'Tài khoản được mở khóa',
        `Admin ${event.actor.email || 'không rõ'} đã ${isLock ? 'khóa tài khoản' : 'mở khóa tài khoản'} người dùng ${event.target.email || 'không rõ'}.${isLock ? ` Lý do: ${event.lockedReason}` : ''}`,
        {
          target_user_id: event.target.id,
          action_by: event.actor.id,
          status: event.status,
        }
      )],
      ['broadcast', this.dependencies.broadcast(event.target.id, {
        status: event.status,
        locked_reason: event.lockedReason,
      })],
    ];
    if (event.target.email) {
      tasks.push(['email', this.sendStatusEmail(event.target.email, isLock, event.lockedReason)]);
    }
    await this.settle(event.target.id, tasks);
  }

  private async insertAudit(row: Record<string, unknown>) {
    const { error } = await this.supabase.from('audit_logs').insert(row);
    if (error) throw error;
  }

  private async notifyAdmins(
    title: string,
    message: string,
    metadata: Record<string, unknown>
  ) {
    const { data, error } = await this.supabase.from('users').select('id').eq('role', 'admin');
    if (error) throw error;
    if (!data?.length) return;
    await this.dependencies.createNotifications(data.map((admin) => ({
      userId: admin.id,
      type: 'info' as const,
      title,
      message,
      metadata,
    })));
  }

  private async sendStatusEmail(email: string, isLock: boolean, lockedReason: string | null) {
    const subject = isLock
      ? '[AntBiz] Thông báo: Tài khoản của bạn đã bị khóa'
      : '[AntBiz] Thông báo: Tài khoản của bạn đã được mở khóa';
    const reason = isLock ? `\nLý do: ${lockedReason}` : '';
    const action = isLock ? 'bị khóa' : 'được mở khóa';
    const text = `Xin chào,\n\nTài khoản của bạn (${email}) đã ${action} bởi quản trị viên.${reason}\n\nTrân trọng,\nĐội ngũ AntBiz`;
    const result = await this.dependencies.sendEmail({
      to: email,
      subject,
      text,
      html: `<div style="font-family: sans-serif; padding: 20px; color: #333"><h2>${isLock ? 'Tài khoản bị khóa' : 'Tài khoản đã được mở khóa'}</h2><p>Xin chào,</p><p>Tài khoản của bạn (<strong>${escapeHtml(email)}</strong>) đã ${action} bởi quản trị viên.</p>${isLock ? `<p><strong>Lý do khóa:</strong> ${escapeHtml(lockedReason || '')}</p>` : ''}<p>Trân trọng,<br/>Đội ngũ AntBiz</p></div>`,
    });
    if (!result.success) throw new Error(result.error || 'Email delivery failed');
  }

  private async settle(targetId: string, tasks: Array<[string, Promise<unknown>]>) {
    const results = await Promise.allSettled(tasks.map(([, task]) => task));
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.dependencies.logger.error('[UserAccessAdministration] Effect failed', {
          effect: tasks[index][0],
          targetId,
          error: result.reason,
        });
      }
    });
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character] as string);
}
