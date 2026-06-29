/**
 * broadcastService.ts
 * 
 * Gửi sự kiện Realtime Broadcast tới client đang online thông qua Supabase.
 * Phải dùng createAdminClient (service role, @supabase/supabase-js) vì chỉ
 * client đó mới tạo được kết nối WebSocket từ phía server.
 *
 * Lưu ý: Broadcast chỉ tới các tab đang kết nối — không lưu DB, không persistent.
 * Cơ chế fallback là postgres_changes subscription ở layout.tsx (nếu table đã được
 * publish trong supabase_realtime).
 */
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Gửi broadcast event tới channel `user-status-{userId}`.
 * Client đang listen trên channel này sẽ nhận được ngay lập tức.
 */
export async function broadcastUserStatusChange(
  userId: string,
  payload: Record<string, unknown>
): Promise<void> {
  return new Promise<void>((resolve) => {
    let resolved = false;
    const safeResolve = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    // Fallback: tự resolve sau 3 giây để tránh treo serverless function
    const timeout = setTimeout(safeResolve, 3000);

    try {
      const adminClient = createAdminClient();
      const channelName = `user-status-${userId}`;
      const channel = adminClient.channel(channelName);

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            const result = await channel.send({
              type: 'broadcast',
              event: 'status_changed',
              payload,
            });
            console.log(`[Broadcast] Sent to ${channelName}:`, result, payload);
          } catch (err: any) {
            console.error(`[Broadcast] Failed to send to ${channelName}:`, err?.message);
          }
          adminClient.removeChannel(channel);
          clearTimeout(timeout);
          safeResolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[Broadcast] Channel error for ${channelName}:`, status);
          adminClient.removeChannel(channel);
          clearTimeout(timeout);
          safeResolve();
        }
      });
    } catch (err: any) {
      console.error('[Broadcast] Unexpected error:', err?.message);
      clearTimeout(timeout);
      safeResolve();
    }
  });
}
