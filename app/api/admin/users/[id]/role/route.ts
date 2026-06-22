import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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
    .select('role')
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

  // Insert audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    target_user_id: id,
    action: 'change_role',
    before_value: { role: oldRole },
    after_value: { role: role },
  });

  return NextResponse.json({ success: true, message: 'Role updated successfully' });
}
