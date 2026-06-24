import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
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
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { role } = body;
  if (!role || !['admin', 'marketer_full', 'marketer_content'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role provided' }, { status: 400 });
  }

  // Get current user role to log the change
  const { data: targetUser, error: fetchError } = await supabase
    .from('users')
    .select('role, email')
    .eq('id', id)
    .single();

  if (fetchError || !targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const oldRole = targetUser.role;

  // Update role
  const { error: updateError } = await supabase
    .from('users')
    .update({ role })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Thực hiện song song các tác vụ phụ (ghi audit log & tạo thông báo in-app)
  const bgPromises: Promise<any>[] = [];

  // 1. Ghi audit log
  bgPromises.push(
    Promise.resolve(
      supabase.from('audit_logs').insert({
        actor_id: user.id,
        target_user_id: id,
        action: 'change_role',
        before_value: { role: oldRole },
        after_value: { role: role },
      })
    ).catch((err: any) => console.error('[Role API] Lỗi khi ghi audit log:', err.message))
  );

  // 2. Gửi thông báo in-app tới toàn bộ Admin (sử dụng bulk insert)
  bgPromises.push(
    (async () => {
      try {
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin');
        
        if (admins && admins.length > 0) {
          const title = 'Thay đổi vai trò người dùng';
          const message = `Admin ${user.email} đã thay đổi vai trò của người dùng ${targetUser.email || 'không rõ'} từ ${oldRole} sang ${role}.`;
          
          const notificationsInput = admins.map(admin => ({
            userId: admin.id,
            type: 'info' as const,
            title,
            message,
            metadata: {
              target_user_id: id,
              action_by: user.id,
              old_role: oldRole,
              new_role: role,
            }
          }));

          await createNotifications(notificationsInput);
        }
      } catch (notifErr: any) {
        console.error('[Role API] Lỗi khi tạo thông báo in-app cho admin:', notifErr.message);
      }
    })()
  );

  // Thực hiện các tác vụ phụ ở background (không await để trả phản hồi ngay lập tức cho client)
  Promise.all(bgPromises);

  return NextResponse.json({ success: true, message: 'Role updated successfully' });
}
