import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendEmail } from '@/lib/email';
import { createNotification, createNotifications } from '@/lib/services/notificationService';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify Admin Role
  const { data: adminProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!adminProfile || adminProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  if (id === user.id) {
    return NextResponse.json({ error: 'Cannot change your own status' }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { status, locked_reason } = body;
  if (!status || !['active', 'locked', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status provided' }, { status: 400 });
  }

  if (status === 'locked' && (!locked_reason || locked_reason.length < 10)) {
    return NextResponse.json({ error: 'A valid reason (min 10 chars) is required to lock an account' }, { status: 400 });
  }

  // Get current user status to log the change
  const { data: targetUser, error: fetchError } = await supabase
    .from('users')
    .select('status, locked_reason, email')
    .eq('id', id)
    .single();

  if (fetchError || !targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const oldStatus = targetUser.status;

  // Update status
  const updatePayload: any = { status };
  if (status === 'locked') {
    updatePayload.locked_reason = locked_reason;
    updatePayload.locked_at = new Date().toISOString();
    updatePayload.locked_by = user.id;
  } else {
    updatePayload.locked_reason = null;
    updatePayload.locked_at = null;
    updatePayload.locked_by = null;
  }

  const { error: updateError } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Thực hiện song song các tác vụ phụ (ghi audit log, gửi email & tạo thông báo in-app)
  const bgPromises: Promise<any>[] = [];

  // 1. Ghi audit log
  bgPromises.push(
    supabase.from('audit_logs').insert({
      actor_id: user.id,
      target_user_id: id,
      action: status === 'locked' ? 'lock_account' : 'unlock_account',
      before_value: { status: oldStatus },
      after_value: { status: status, reason: locked_reason || null },
    })
    .catch((err) => console.error('[Status API] Lỗi khi ghi audit log:', err.message))
  );

  // 2. Gửi email thông báo cho người dùng bị khóa/mở khóa
  if (targetUser.email) {
    const isLock = status === 'locked';
    const subject = isLock 
      ? '[AntBiz] Thông báo: Tài khoản của bạn đã bị khóa' 
      : '[AntBiz] Thông báo: Tài khoản của bạn đã được mở khóa';
    
    const text = isLock
      ? `Xin chào,\n\nTài khoản của bạn (${targetUser.email}) đã bị khóa bởi quản trị viên.\nLý do: ${locked_reason}\n\nTrân trọng,\nĐội ngũ AntBiz`
      : `Xin chào,\n\nTài khoản của bạn (${targetUser.email}) đã được mở khóa bởi quản trị viên. Bạn hiện có thể đăng nhập vào hệ thống.\n\nTrân trọng,\nĐội ngũ AntBiz`;
       
    const html = isLock
      ? `<div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Tài khoản bị khóa</h2>
          <p>Xin chào,</p>
          <p>Tài khoản của bạn (<strong>${targetUser.email}</strong>) đã bị khóa bởi quản trị viên.</p>
          <p><strong>Lý do khóa:</strong> ${locked_reason}</p>
          <br/>
          <p>Trân trọng,<br/>Đội ngũ AntBiz</p>
        </div>`
      : `<div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Tài khoản đã được mở khóa</h2>
          <p>Xin chào,</p>
          <p>Tài khoản của bạn (<strong>${targetUser.email}</strong>) đã được mở khóa bởi quản trị viên. Bạn hiện có thể đăng nhập và sử dụng hệ thống.</p>
          <br/>
          <p>Trân trọng,<br/>Đội ngũ AntBiz</p>
        </div>`;

    bgPromises.push(
      sendEmail({
        to: targetUser.email,
        subject,
        text,
        html
      })
      .then(() => console.log(`[Status API] Đã gửi email thông báo tới ${targetUser.email}`))
      .catch((emailErr) => console.error('[Status API] Lỗi khi gửi email thông báo status:', emailErr.message))
    );
  }

  // 3. Gửi thông báo in-app tới toàn bộ Admin (sử dụng bulk insert)
  bgPromises.push(
    (async () => {
      try {
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin');
        
        if (admins && admins.length > 0) {
          const actionLabel = status === 'locked' ? 'khóa tài khoản' : 'mở khóa tài khoản';
          const title = status === 'locked' ? 'Tài khoản bị khóa' : 'Tài khoản được mở khóa';
          const message = `Admin ${user.email} đã ${actionLabel} người dùng ${targetUser.email}.` + 
            (status === 'locked' ? ` Lý do: ${locked_reason}` : '');
             
          const notificationsInput = admins.map(admin => ({
            userId: admin.id,
            type: 'info' as const,
            title,
            message,
            metadata: {
              target_user_id: id,
              action_by: user.id,
              status,
            }
          }));

          await createNotifications(notificationsInput);
        }
      } catch (notifErr: any) {
        console.error('[Status API] Lỗi khi tạo thông báo in-app cho admin:', notifErr.message);
      }
    })()
  );

  // Chờ tất cả hoàn tất song song
  await Promise.all(bgPromises);

  return NextResponse.json({ success: true, message: 'Status updated successfully' });
}
